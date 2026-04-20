
import { useState, useEffect, useMemo, useCallback } from 'react';
import { listenToDuplicateAlerts } from '../services/firebase';
import { DuplicateAlert } from '../types';

export const useDuplicateFilter = () => {
    const [duplicateAlerts, setDuplicateAlerts] = useState<DuplicateAlert[]>([]);
    const [showDuplicates, setShowDuplicates] = useState<boolean>(() => {
        const saved = localStorage.getItem('fml-show-duplicates');
        return saved !== null ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        const unsubscribe = listenToDuplicateAlerts(setDuplicateAlerts);
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        localStorage.setItem('fml-show-duplicates', JSON.stringify(showDuplicates));
    }, [showDuplicates]);

    const duplicateIds = useMemo(() => {
        const idsToHide = new Set<string>();
        
        // Group alerts by their metadata (field + value) to identify sets of duplicates
        const groups = new Map<string, string[]>();
        
        duplicateAlerts.forEach(alert => {
            if (alert.status !== 'pending') return;
            
            const key = `${alert.type}-${alert.metadata.field}-${alert.metadata.value}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            // Add all affected IDs to the group
            alert.affectedIds.forEach(id => {
                if (!groups.get(key)!.includes(id)) {
                    groups.get(key)!.push(id);
                }
            });
        });

        // For each group, keep the FIRST ID and hide the rest
        groups.forEach(ids => {
            if (ids.length > 1) {
                // Keep the first one, hide the others
                ids.slice(1).forEach(id => idsToHide.add(id));
            }
        });

        return idsToHide;
    }, [duplicateAlerts]);

    const filterDuplicates = useCallback(<T extends { id: string }>(items: T[]): T[] => {
        if (showDuplicates) return items;
        return items.filter(item => !duplicateIds.has(item.id));
    }, [showDuplicates, duplicateIds]);

    return {
        showDuplicates,
        setShowDuplicates,
        duplicateIds,
        filterDuplicates,
        duplicateAlertsCount: duplicateAlerts.length
    };
};
