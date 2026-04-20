
// FIX: Import `Type` for defining response schemas.
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { PassportData, VisaData, PermitData, TicketData, GhanaCardData } from '../types';
import { performMultiOcr } from './multiOcrService';

const getAiInstance = () => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("Gemini API key not found. OCR functionality will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

// FIX: Modified extractData to accept a response schema for more reliable JSON output.
const stripBase64Prefix = (base64: string) => {
    if (base64.startsWith('data:')) {
        return base64.split(',')[1];
    }
    return base64;
};

const extractData = async (base64Image: string, mimeType: string, prompt: string, schema: object) => {
    const ai = getAiInstance();
    if (!ai) {
        throw new Error("API Key for Gemini is not configured.");
    }

    try {
        const imagePart = {
            inlineData: {
                data: stripBase64Prefix(base64Image),
                mimeType: mimeType,
            },
        };

        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                // FIX: Apply the response schema to the request config.
                responseSchema: schema,
            }
        });

        if (!response.text) {
            throw new Error("Gemini returned an empty response.");
        }

        const jsonString = response.text.trim();
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse Gemini JSON:", jsonString);
            throw new Error("Invalid response format from AI.");
        }

    } catch (error: any) {
        console.error("Error extracting data with Gemini:", error);
        throw new Error(error.message || "Failed to extract data from the document. Please check the image quality or enter the data manually.");
    }
};

export const extractPassportData = async (base64Image: string, mimeType: string): Promise<Partial<PassportData>> => {
  const startTime = Date.now();
  try {
    // Try multi-provider OCR first
    const ocrResult = await performMultiOcr(stripBase64Prefix(base64Image), mimeType);
    if (ocrResult && ocrResult.text) {
      console.log(`Using ${ocrResult.provider} for passport data extraction`);
      const data = await extractPassportDataFromText(ocrResult.text);
      const durationStr = ocrResult.duration ? `(${(ocrResult.duration / 1000).toFixed(1)}s)` : '';
      return { ...data, ocrSource: `${ocrResult.provider} ${durationStr}`.trim() };
    }
  } catch (error) {
    console.warn("Multi-provider OCR failed for passport, falling back to Gemini Vision:", error);
  }

  // Fallback to Gemini Vision
  const prompt = `Extract passport details from this image. Identify the following fields: type, code, passportNumber, surname, firstNames, nationality, dateOfBirth (in YYYY-MM-DD format), sex, placeOfBirth, dateOfIssue (in YYYY-MM-DD format), authority, and dateOfExpiry (in YYYY-MM-DD format). Return the result as a valid JSON object with keys matching these field names exactly. If a field is not found, its value should be an empty string.`;
  const schema = {
      type: Type.OBJECT,
      properties: {
          type: { type: Type.STRING },
          code: { type: Type.STRING },
          passportNumber: { type: Type.STRING },
          surname: { type: Type.STRING },
          firstNames: { type: Type.STRING },
          nationality: { type: Type.STRING },
          dateOfBirth: { type: Type.STRING },
          sex: { type: Type.STRING },
          placeOfBirth: { type: Type.STRING },
          dateOfIssue: { type: Type.STRING },
          authority: { type: Type.STRING },
          dateOfExpiry: { type: Type.STRING },
      }
  };
  const result = await extractData(base64Image, mimeType, prompt, schema);
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  return { ...result, ocrSource: `Gemini Vision (${totalDuration}s)` };
};

export const extractGhanaCardData = async (base64Image: string, mimeType: string): Promise<Partial<GhanaCardData>> => {
  const startTime = Date.now();
  try {
    // Try multi-provider OCR first
    const ocrResult = await performMultiOcr(stripBase64Prefix(base64Image), mimeType);
    if (ocrResult && ocrResult.text) {
      console.log(`Using ${ocrResult.provider} for Ghana Card data extraction`);
      const data = await extractGhanaCardDataFromText(ocrResult.text);
      const durationStr = ocrResult.duration ? `(${(ocrResult.duration / 1000).toFixed(1)}s)` : '';
      return { ...data, ocrSource: `${ocrResult.provider} ${durationStr}`.trim() };
    }
  } catch (error) {
    console.warn("Multi-provider OCR failed for Ghana Card, falling back to Gemini Vision:", error);
  }

  const prompt = `Extract Ghana Card details from this image. Identify the following fields: surname, firstNames, nationality, dateOfBirth (in YYYY-MM-DD format), cardNumber (often labeled 'Personal ID No.'), height, documentNumber, placeOfIssuance, dateOfIssue (in YYYY-MM-DD format), and dateOfExpiry (in YYYY-MM-DD format). Return as a valid JSON object. If a field is not found, its value should be an empty string.`;
  const schema = {
      type: Type.OBJECT,
      properties: {
          surname: { type: Type.STRING },
          firstNames: { type: Type.STRING },
          nationality: { type: Type.STRING },
          dateOfBirth: { type: Type.STRING },
          cardNumber: { type: Type.STRING }, // Personal ID Number
          height: { type: Type.STRING },
          documentNumber: { type: Type.STRING },
          placeOfIssuance: { type: Type.STRING },
          dateOfIssue: { type: Type.STRING },
          dateOfExpiry: { type: Type.STRING },
      }
  };
  const result = await extractData(base64Image, mimeType, prompt, schema);
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  return { ...result, ocrSource: `Gemini Vision (${totalDuration}s)` };
};

export const extractVisaData = async (base64Image: string, mimeType: string): Promise<Partial<VisaData>> => {
    const startTime = Date.now();
    const prompt = `Extract visa details from this image. Identify: visaNumber, dateOfIssue (in YYYY-MM-DD format), dateOfExpiry (in YYYY-MM-DD format), and country. Return as a valid JSON object. If a field is not found, its value should be an empty string.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            visaNumber: { type: Type.STRING },
            dateOfIssue: { type: Type.STRING },
            dateOfExpiry: { type: Type.STRING },
            country: { type: Type.STRING },
        }
    };

    try {
        // Try multi-provider OCR first
        const ocrResult = await performMultiOcr(stripBase64Prefix(base64Image), mimeType);
        if (ocrResult && ocrResult.text) {
            console.log(`Using ${ocrResult.provider} for visa data extraction`);
            const ai = getAiInstance();
            if (ai) {
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: { parts: [{ text: `You are an expert document parser. Extract visa details from the following raw OCR text:
                    
                    """
                    ${ocrResult.text}
                    """
                    
                    Identify: visaNumber, dateOfIssue (in YYYY-MM-DD format), dateOfExpiry (in YYYY-MM-DD format), and country. 
                    The OCR text may contain noise or misread characters, so use context to correct them.
                    Return as a valid JSON object.` }] },
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: schema,
                    }
                });
                if (response.text) {
                    const data = JSON.parse(response.text);
                    const durationStr = ocrResult.duration ? `(${(ocrResult.duration / 1000).toFixed(1)}s)` : '';
                    return { ...data, ocrSource: `${ocrResult.provider} ${durationStr}`.trim() };
                }
            }
        }
    } catch (error) {
        console.warn("Custom OCR API failed for visa, falling back to Gemini Vision:", error);
    }

    const result = await extractData(base64Image, mimeType, prompt, schema);
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    return { ...result, ocrSource: `Gemini Vision (${totalDuration}s)` };
};

export const extractPermitData = async (base64Image: string, mimeType: string): Promise<Partial<PermitData>> => {
    const startTime = Date.now();
    const prompt = `Extract resident permit details from this image. Identify: permitNumber, type (e.g., "Work Permit", "Residence Permit"), dateOfIssue (in YYYY-MM-DD format), and dateOfExpiry (in YYYY-MM-DD format). Return as a valid JSON object. If a field is not found, its value should be an empty string.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            permitNumber: { type: Type.STRING },
            type: { type: Type.STRING },
            dateOfIssue: { type: Type.STRING },
            dateOfExpiry: { type: Type.STRING },
        }
    };

    try {
        // Try multi-provider OCR first
        const ocrResult = await performMultiOcr(stripBase64Prefix(base64Image), mimeType);
        if (ocrResult && ocrResult.text) {
            console.log(`Using ${ocrResult.provider} for permit data extraction`);
            const ai = getAiInstance();
            if (ai) {
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: { parts: [{ text: `You are an expert document parser. Extract resident permit details from the following raw OCR text:
                    
                    """
                    ${ocrResult.text}
                    """
                    
                    Identify: permitNumber, type (e.g., "Work Permit", "Residence Permit"), dateOfIssue (in YYYY-MM-DD format), and dateOfExpiry (in YYYY-MM-DD format).
                    The OCR text may contain noise or misread characters, so use context to correct them.
                    Return as a valid JSON object.` }] },
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: schema,
                    }
                });
                if (response.text) {
                    const data = JSON.parse(response.text);
                    const durationStr = ocrResult.duration ? `(${(ocrResult.duration / 1000).toFixed(1)}s)` : '';
                    return { ...data, ocrSource: `${ocrResult.provider} ${durationStr}`.trim() };
                }
            }
        }
    } catch (error) {
        console.warn("Custom OCR API failed for permit, falling back to Gemini Vision:", error);
    }

    const result = await extractData(base64Image, mimeType, prompt, schema);
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    return { ...result, ocrSource: `Gemini Vision (${totalDuration}s)` };
};

export const extractTicketData = async (base64Image: string, mimeType: string): Promise<Partial<TicketData>> => {
    const startTime = Date.now();
    const prompt = `Extract airline ticket details from this image. Identify: ticketNumber, airline, departureCity, arrivalCity, and travelDate (in YYYY-MM-DD format). Return as a valid JSON object. If a field is not found, its value should be an empty string.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            ticketNumber: { type: Type.STRING },
            airline: { type: Type.STRING },
            departureCity: { type: Type.STRING },
            arrivalCity: { type: Type.STRING },
            travelDate: { type: Type.STRING },
        }
    };

    try {
        // Try multi-provider OCR first
        const ocrResult = await performMultiOcr(stripBase64Prefix(base64Image), mimeType);
        if (ocrResult && ocrResult.text) {
            console.log(`Using ${ocrResult.provider} for ticket data extraction`);
            const ai = getAiInstance();
            if (ai) {
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: { parts: [{ text: `You are an expert document parser. Extract airline ticket details from the following raw OCR text:
                    
                    """
                    ${ocrResult.text}
                    """
                    
                    Identify: ticketNumber, airline, departureCity, arrivalCity, and travelDate (in YYYY-MM-DD format).
                    The OCR text may contain noise or misread characters, so use context to correct them.
                    Return as a valid JSON object.` }] },
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: schema,
                    }
                });
                if (response.text) {
                    const data = JSON.parse(response.text);
                    const durationStr = ocrResult.duration ? `(${(ocrResult.duration / 1000).toFixed(1)}s)` : '';
                    return { ...data, ocrSource: `${ocrResult.provider} ${durationStr}`.trim() };
                }
            }
        }
    } catch (error) {
        console.warn("Custom OCR API failed for ticket, falling back to Gemini Vision:", error);
    }

    const result = await extractData(base64Image, mimeType, prompt, schema);
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    return { ...result, ocrSource: `Gemini Vision (${totalDuration}s)` };
};

export const extractProfilePhoto = async (base64Image: string, mimeType: string): Promise<string | null> => {
    const ai = getAiInstance();
    if (!ai) {
        // Don't throw an error, just return null so the app can proceed without it.
        console.warn("API Key for Gemini is not configured. Cannot extract profile photo.");
        return null;
    }

    try {
        const imagePart = {
            inlineData: {
                data: stripBase64Prefix(base64Image),
                mimeType: mimeType,
            },
        };

        const textPart = {
            text: "Isolate and extract the main portrait photo from this document. Return only the cropped image of the person's face. Do not return any other part of the document."
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        if (!response.candidates?.[0]?.content?.parts) {
            console.warn("Gemini returned no content parts for profile photo.");
            return null;
        }
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                // Assuming PNG, but it should be fine for display purposes.
                return `data:image/png;base64,${base64ImageBytes}`;
            }
        }

        return null;

    } catch (error) {
        console.error("Error extracting profile photo with Gemini:", error);
        // Don't throw, just return null. The app can function without the photo.
        return null;
    }
};

export interface MatchedFlightData {
    ticketData: Partial<TicketData>;
    passengerName: string;
    matchedPassengerId: string;
    confidence: number;
}

const FLIGHT_BATCH_SCHEMA = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            ticketData: {
                type: Type.OBJECT,
                properties: {
                    ticketNumber: { type: Type.STRING, description: "The ticket number, if available. Otherwise an empty string." },
                    airline: { type: Type.STRING, description: "The airline name." },
                    departureCity: { type: Type.STRING, description: "The city of departure." },
                    arrivalCity: { type: Type.STRING, description: "The city of arrival." },
                    travelDate: { type: Type.STRING, description: "The date of travel in YYYY-MM-DD format." },
                    travelTime: { type: Type.STRING, description: "The time of travel in HH:MM format." },
                },
                required: ["airline", "departureCity", "arrivalCity", "travelDate"]
            },
            passengerName: { type: Type.STRING, description: "The full name of the passenger as found in the text." },
            matchedPassengerId: { type: Type.STRING, description: "The ID of the passenger if matched from the Known Personnel List, otherwise an empty string." },
            confidence: { type: Type.NUMBER, description: "A confidence score between 0 and 1 for the passenger match." },
        },
        required: ["ticketData", "passengerName", "matchedPassengerId", "confidence"]
    }
};

export const extractFlightDataFromTextAI = async (
    text: string, 
    passengerList: {id: string, name: string}[] 
): Promise<MatchedFlightData[]> => {
    const ai = getAiInstance();
    if (!ai) throw new Error("API Key for Gemini is not configured.");

    // Simplify the passenger list to just ID and Name to save tokens context
    const simplifiedList = passengerList.map(p => `ID:${p.id} Name:${p.name}`).join('\n');

    const prompt = `
    You are an intelligent travel data assistant.
    1. Extract all flight ticket information from the provided text extracted from a PDF.
    
    CRITICAL INSTRUCTION: 
    - A single document may contain MULTIPLE tickets for the SAME passenger, or MULTIPLE tickets for DIFFERENT passengers.
    - You MUST extract EVERY SINGLE flight leg as a SEPARATE object in the JSON array.
    - Do NOT combine dates, times, or routes into a single string. Each flight segment is a distinct object.
    
    2. For each flight found, identify the Passenger Name.
    3. Match the extracted Passenger Name against the following "Known Personnel List".
       Use fuzzy matching to handle variations (e.g., "John Doe" matches "Doe, John" or "J. Doe").
       
    Known Personnel List:
    ${simplifiedList}

    4. Map Airport Codes to full city names if possible (e.g., ACC -> Accra, TKD -> Takoradi, KMS -> Kumasi, TML -> Tamale).
    5. Return a JSON Array of objects.
    
    Data to extract per flight (return as a JSON object with this structure):
    {
      "ticketData": {
        "ticketNumber": "...",
        "airline": "...",
        "departureCity": "...",
        "arrivalCity": "...",
        "travelDate": "YYYY-MM-DD",
        "travelTime": "HH:MM"
      },
      "passengerName": "...",
      "matchedPassengerId": "...",
      "confidence": 0.95
    }
    
    Text to analyze:
    ${text}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: FLIGHT_BATCH_SCHEMA,
            },
        });

        const jsonStr = response.text?.trim() || "[]";
        const parsed = JSON.parse(jsonStr) as MatchedFlightData[];
        return parsed;
    } catch (error) {
        console.error("Gemini Text Extraction Error:", error);
        throw new Error("Failed to extract data using AI Text Parsing.");
    }
};

export const classifyAndExtractDocument = async (base64Image: string, mimeType: string): Promise<{ type: string, data: any }> => {
    const ai = getAiInstance();
    if (!ai) throw new Error("API Key for Gemini is not configured.");

    try {
        // Try multi-provider OCR first
        const ocrResult = await performMultiOcr(stripBase64Prefix(base64Image), mimeType);
        if (ocrResult && ocrResult.text) {
            console.log(`Using ${ocrResult.provider} for document classification and extraction`);
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts: [{ text: `You are an expert document classifier and parser. 
                Analyze the following raw OCR text and determine what type of document it is.
                
                OCR Text:
                """
                ${ocrResult.text}
                """
                
                Possible types: "passport", "ghana_card", "visa", "permit", "ticket", "other".
                
                If it matches one of the types, extract the relevant data according to these schemas:
                - passport: { type, code, passportNumber, surname, firstNames, nationality, dateOfBirth, sex, placeOfBirth, dateOfIssue, authority, dateOfExpiry }
                - ghana_card: { surname, firstNames, nationality, dateOfBirth, cardNumber, height, documentNumber, placeOfIssuance, dateOfIssue, dateOfExpiry }
                - visa: { visaNumber, dateOfIssue, dateOfExpiry, country }
                - permit: { permitNumber, type, dateOfIssue, dateOfExpiry }
                - ticket: { ticketNumber, airline, departureCity, arrivalCity, travelDate }
                
                Return a JSON object with:
                {
                  "type": "one of the types above",
                  "data": { ... extracted data ... }
                }
                
                If it's "other", just return the type "other" and an empty data object.` }] },
                config: {
                    responseMimeType: "application/json",
                }
            });
            if (response.text) {
                const result = JSON.parse(response.text);
                if (result.data) result.data.ocrSource = ocrResult.provider;
                return result;
            }
        }
    } catch (error) {
        console.warn("Custom OCR API failed for classification, falling back to Gemini Vision:", error);
    }

    // Fallback to Gemini Vision if OCR fails or is not enough
    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: {
            parts: [
                { inlineData: { data: stripBase64Prefix(base64Image), mimeType } },
                { text: `Analyze this document image. Determine its type and extract data.
                Possible types: "passport", "ghana_card", "visa", "permit", "ticket", "other".
                Return a JSON object with "type" and "data" fields.` }
            ]
        },
        config: {
            responseMimeType: "application/json",
        }
    });
    const finalResult = JSON.parse(response.text || '{"type": "other", "data": {}}');
    if (finalResult.data) finalResult.data.ocrSource = 'Gemini Vision';
    return finalResult;
};

export const extractBatchFlightData = async (
    base64Image: string, 
    mimeType: string, 
    passengerList: {id: string, name: string}[] 
): Promise<MatchedFlightData[]> => {
    try {
        // Try multi-provider OCR first
        const ocrResult = await performMultiOcr(stripBase64Prefix(base64Image), mimeType);
        if (ocrResult && ocrResult.text) {
            console.log(`Using ${ocrResult.provider} for batch flight data extraction`);
            const results = await extractFlightDataFromTextAI(ocrResult.text, passengerList);
            return results.map(r => ({
                ...r,
                ticketData: { ...r.ticketData, ocrSource: ocrResult.provider }
            }));
        }
    } catch (error) {
        console.warn("Multi-provider OCR failed for batch flights, falling back to Gemini Vision:", error);
    }

    const ai = getAiInstance();
    if (!ai) throw new Error("API Key for Gemini is not configured.");

    // Simplify the passenger list to just ID and Name to save tokens context
    const simplifiedList = passengerList.map(p => `ID:${p.id} Name:${p.name}`).join('\n');

    const prompt = `
    You are an intelligent travel data assistant.
    1. Extract all flight ticket information from the provided document (image or PDF).
    
    CRITICAL INSTRUCTION: 
    - A single document may contain MULTIPLE tickets for the SAME passenger, or MULTIPLE tickets for DIFFERENT passengers.
    - You MUST extract EVERY SINGLE flight leg as a SEPARATE object in the JSON array.
    - Do NOT combine dates, times, or routes into a single string. Each flight segment is a distinct object.
    
    2. For each flight found, identify the Passenger Name.
    3. Match the extracted Passenger Name against the following "Known Personnel List".
       Use fuzzy matching to handle variations (e.g., "John Doe" matches "Doe, John" or "J. Doe").
       
    Known Personnel List:
    ${simplifiedList}
 
    4. Map Airport Codes to full city names if possible (e.g., ACC -> Accra, TKD -> Takoradi, KMS -> Kumasi, TML -> Tamale).
    5. Return a JSON Array of objects.
    
    Data to extract per flight (return as a JSON object with this structure):
    {
      "ticketData": {
        "ticketNumber": "...",
        "airline": "...",
        "departureCity": "...",
        "arrivalCity": "...",
        "travelDate": "YYYY-MM-DD",
        "travelTime": "HH:MM"
      },
      "passengerName": "...",
      "matchedPassengerId": "...",
      "confidence": 0.95
    }
    `;

    try {
        const imagePart = {
            inlineData: {
                data: stripBase64Prefix(base64Image),
                mimeType: mimeType,
            },
        };

        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: FLIGHT_BATCH_SCHEMA,
            }
        });

        if (!response.text) {
            throw new Error("Gemini returned an empty response.");
        }

        const jsonString = response.text.trim();
        try {
            const results = JSON.parse(jsonString) as MatchedFlightData[];
            return results.map(r => ({
                ...r,
                ticketData: { ...r.ticketData, ocrSource: 'Gemini Vision' }
            }));
        } catch (e) {
            console.error("Failed to parse Gemini JSON:", jsonString);
            throw new Error("Invalid response format from AI.");
        }

    } catch (error: any) {
        console.error("Error extracting batch flight data:", error);
        throw new Error(error.message || "Failed to process batch document.");
    }
};

export const extractPassportDataFromText = async (text: string): Promise<Partial<PassportData>> => {
  const ai = getAiInstance();
  if (!ai) throw new Error("API Key for Gemini is not configured.");

  const prompt = `You are an expert document parser. Extract passport details from the following raw OCR text. 
  The OCR text may contain noise, misread characters, or be unstructured. Use your intelligence to identify the correct values.
  
  Identify the following fields: type, code, passportNumber, surname, firstNames, nationality, dateOfBirth (in YYYY-MM-DD format), sex, placeOfBirth, dateOfIssue (in YYYY-MM-DD format), authority, and dateOfExpiry (in YYYY-MM-DD format). 
  Return the result as a valid JSON object with keys matching these field names exactly. If a field is not found, its value should be an empty string.

  Input Text:
  """
  ${text}
  """
  `;

  const schema = {
      type: Type.OBJECT,
      properties: {
          type: { type: Type.STRING },
          code: { type: Type.STRING },
          passportNumber: { type: Type.STRING },
          surname: { type: Type.STRING },
          firstNames: { type: Type.STRING },
          nationality: { type: Type.STRING },
          dateOfBirth: { type: Type.STRING },
          sex: { type: Type.STRING },
          placeOfBirth: { type: Type.STRING },
          dateOfIssue: { type: Type.STRING },
          authority: { type: Type.STRING },
          dateOfExpiry: { type: Type.STRING },
      }
  };

  try {
      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { parts: [{ text: prompt }] },
          config: {
              responseMimeType: "application/json",
              responseSchema: schema,
          }
      });

      if (!response.text) {
          throw new Error("Gemini returned an empty response.");
      }

      const jsonString = response.text.trim();
      return JSON.parse(jsonString);
  } catch (error: any) {
      console.error("Error extracting passport data from text:", error);
      throw new Error("Failed to extract passport data from text.");
  }
};

export const extractGhanaCardDataFromText = async (text: string): Promise<Partial<GhanaCardData>> => {
  const ai = getAiInstance();
  if (!ai) throw new Error("API Key for Gemini is not configured.");

  const prompt = `You are an expert document parser. Extract Ghana Card details from the following raw OCR text.
  The OCR text may contain noise, misread characters, or be unstructured. Use your intelligence to identify the correct values.

  Identify the following fields: surname, firstNames, nationality, dateOfBirth (in YYYY-MM-DD format), cardNumber (often labeled 'Personal ID No.'), height, documentNumber, placeOfIssuance, dateOfIssue (in YYYY-MM-DD format), and dateOfExpiry (in YYYY-MM-DD format). 
  Return as a valid JSON object. If a field is not found, its value should be an empty string.

  Input Text:
  """
  ${text}
  """
  `;

  const schema = {
      type: Type.OBJECT,
      properties: {
          surname: { type: Type.STRING },
          firstNames: { type: Type.STRING },
          nationality: { type: Type.STRING },
          dateOfBirth: { type: Type.STRING },
          cardNumber: { type: Type.STRING }, // Personal ID Number
          height: { type: Type.STRING },
          documentNumber: { type: Type.STRING },
          placeOfIssuance: { type: Type.STRING },
          dateOfIssue: { type: Type.STRING },
          dateOfExpiry: { type: Type.STRING },
      }
  };

  try {
      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { parts: [{ text: prompt }] },
          config: {
              responseMimeType: "application/json",
              responseSchema: schema,
          }
      });

      if (!response.text) {
          throw new Error("Gemini returned an empty response.");
      }

      const jsonString = response.text.trim();
      return JSON.parse(jsonString);
  } catch (error: any) {
      console.error("Error extracting Ghana Card data from text:", error);
      throw new Error("Failed to extract Ghana Card data from text.");
  }
};

export const extractFlightDataFromText = async (
    text: string, 
    passengerList: {id: string, name: string}[] 
): Promise<MatchedFlightData[]> => {
    const ai = getAiInstance();
    if (!ai) throw new Error("API Key for Gemini is not configured.");

    const simplifiedList = passengerList.map(p => `ID:${p.id} Name:${p.name}`).join('\n');

    const prompt = `
    You are an intelligent travel data assistant.
    The user has pasted unstructured text containing flight ticket information (e.g. from an email or GDS system).
    
    1. Parse the text to find all distinct flight bookings/tickets.
    
    CRITICAL INSTRUCTION: If the text contains multiple flight legs or separate tickets for the same person (e.g. Outbound and Return), you MUST return them as SEPARATE objects in the JSON array.
    Do NOT combine dates (e.g. "2023-10-01 / 2023-10-05") into a single field. Create two separate entries.
    
    2. For each flight found, identify the Passenger Name.
    3. Match the extracted Passenger Name against the following "Known Personnel List".
       Use fuzzy matching to handle variations.
       
    Known Personnel List:
    ${simplifiedList}

    4. Map Airport Codes to full city names (e.g., ACC -> Accra).
    5. Return a JSON Array of objects.
    
    Data to extract per flight (return as a JSON object with this structure):
    {
      "ticketData": {
        "ticketNumber": "...",
        "airline": "...",
        "departureCity": "...",
        "arrivalCity": "...",
        "travelDate": "YYYY-MM-DD",
        "travelTime": "HH:MM"
      },
      "passengerName": "...",
      "matchedPassengerId": "...",
      "confidence": 0.95
    }
    
    Input Text:
    """
    ${text}
    """
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: FLIGHT_BATCH_SCHEMA,
            }
        });

        if (!response.text) {
            throw new Error("Gemini returned an empty response.");
        }

        const jsonString = response.text.trim();
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse Gemini JSON:", jsonString);
            throw new Error("Invalid response format from AI.");
        }

    } catch (error: any) {
        console.error("Error extracting flight data from text:", error);
        throw new Error(error.message || "Failed to process text input.");
    }
};
