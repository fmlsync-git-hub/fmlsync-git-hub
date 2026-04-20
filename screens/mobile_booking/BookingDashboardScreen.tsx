import React from 'react';
import { TicketIcon, CalendarDaysIcon, UserIcon } from '../../components/icons';

const PopularDestinationCard: React.FC<{ name: string, country: string, imageUrl: string }> = ({ name, country, imageUrl }) => (
    <div className="relative rounded-xl overflow-hidden h-40">
        <img src={imageUrl} alt={name} className="w-full h-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-3 text-white">
            <h4 className="font-bold">{name}</h4>
            <p className="text-xs">{country}</p>
        </div>
    </div>
);


const BookingDashboardScreen: React.FC = () => {
    return (
        <div>
            {/* Header for Mobile and Tablet */}
            <header className="p-6 text-white bg-blue-600 lg:hidden">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Booking</h1>
                    <div className="w-10 h-10 bg-white/30 rounded-full"></div> {/* Placeholder for profile pic */}
                </div>
            </header>
            
            <div className="bg-slate-100 rounded-t-3xl p-6 -mt-4 lg:mt-0 lg:rounded-none">
                 {/* Header for Desktop */}
                <header className="hidden lg:block mb-6">
                     <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                     <p className="text-gray-500">Welcome back, let's book your next trip.</p>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Main Content: Booking Form */}
                    <div className="xl:col-span-2">
                        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                             <h2 className="text-xl font-bold text-gray-800 mb-2">Book your flight</h2>
                             <div className="relative">
                                <input type="text" placeholder="App Name - E-comm..." className="w-full p-4 pl-12 rounded-lg bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                                <TicketIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400"/>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative">
                                    <input type="text" placeholder="29 July - 3 Aug" className="w-full p-4 pl-12 rounded-lg bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                                    <CalendarDaysIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400"/>
                                </div>
                                 <div className="relative">
                                    <input type="text" placeholder="1 Room - 2 Adults" className="w-full p-4 pl-12 rounded-lg bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400"/>
                                </div>
                             </div>
                             <button className="w-full bg-blue-500 text-white font-bold py-4 rounded-lg shadow-md hover:bg-blue-600 transition-colors">
                                Search
                             </button>
                        </div>
                    </div>

                    {/* Sidebar Content: Previous Booking & Popular Destinations */}
                    <div className="xl:col-span-1 space-y-8">
                         <div>
                            <h2 className="text-xl font-bold text-gray-800">Previous Booking</h2>
                            <div className="bg-white rounded-2xl shadow-lg p-4 mt-4 flex items-center gap-4">
                                <div className="w-24 h-24 bg-cover bg-center rounded-lg" style={{backgroundImage: "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop')"}}></div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-gray-900">Gamingqubes</h3>
                                    <p className="text-sm text-gray-500">29 July, 2024</p>
                                    <div className="flex items-center mt-2">
                                        {[...Array(5)].map((_, i) => (
                                            <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>
                                        ))}
                                    </div>
                                </div>
                            </div>
                         </div>
                         <div>
                            <h2 className="text-xl font-bold text-gray-800">Popular Destinations</h2>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <PopularDestinationCard name="Paris" country="France" imageUrl="https://images.unsplash.com/photo-1502602898657-3e91760c0341?q=80&w=2070&auto=format&fit=crop" />
                                <PopularDestinationCard name="Bali" country="Indonesia" imageUrl="https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1938&auto=format&fit=crop" />
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingDashboardScreen;