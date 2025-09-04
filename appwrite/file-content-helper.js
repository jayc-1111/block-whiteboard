// === FILE CONTENT JSON EMBEDDING UTILITY ===
// This utility helps with the JSON embedding approach for the files collection
// Required due to Appwrite's 5-attribute limit per collection in free plan

export class FileContentHelper {
    /**
     * Parse JSON-embedded file content into separate components
     * @param {string} jsonContent - JSON string from database content field
     * @returns {Object} { text, position, sections }
     */
    static parse(jsonContent) {
        try {
            const data = JSON.parse(jsonContent || '{}');
            return {
                text: data.text || '',
                position: data.position || { left: 0, top: 0 },
                sections: data.sections || []
            };
        } catch (error) {
            console.error('Error parsing file content JSON:', error);
            return {
                text: '',
                position: { left: 0, top: 0 },
                sections: []
            };
        }
    }

    /**
     * Create JSON-embedded file content from separate components
     * @param {string} text - File text content
     * @param {Object} position - Position object { left, top }
     * @param {Array} sections - Array of section strings
     * @returns {string} JSON string for database storage
     */
    static stringify(text, position, sections) {
        try {
            return JSON.stringify({
                text: text || '',
                position: position || { left: 0, top: 0 },
                sections: sections || []
            });
        } catch (error) {
            console.error('Error stringify file content JSON:', error);
            return JSON.stringify({
                text: '',
                position: { left: 0, top: 0 },
                sections: []
            });
        }
    }

    /**
     * Convenience method for creating database-ready file object
     * @param {Object} fileData - { boardId, folderId, title, text, position, sections, bookmarks }
     * @returns {Object} File object ready for database save
     */
    static createFileObject(fileData) {
        return {
            boardId: fileData.boardId,
            folderId: fileData.folderId,
            title: fileData.title,
            content: this.stringify(fileData.text, fileData.position, fileData.sections),
            bookmarks: JSON.stringify(fileData.bookmarks || [])
        };
    }

    /**
     * Convenience method for parsing complete file object from database
     * @param {Object} dbFile - File object from database query
     * @returns {Object} Parsed file object with extracted content
     */
    static parseFileObject(dbFile) {
        const embedded = this.parse(dbFile.content);
        return {
            id: dbFile.$id,
            boardId: dbFile.boardId,
            folderId: dbFile.folderId,
            title: dbFile.title,
            text: embedded.text,
            position: embedded.position,
            sections: embedded.sections,
            bookmarks: JSON.parse(dbFile.bookmarks || '[]'),
            createdAt: dbFile.$createdAt,
            updatedAt: dbFile.$updatedAt
        };
    }

    /**
     * Update specific content part without replacing everything
     * @param {string} currentJson - Current JSON content string
     * @param {string} field - Field to update (text, position, sections)
     * @param {*} value - New value for the field
     * @returns {string} Updated JSON string
     */
    static updateField(currentJson, field, value) {
        const parsed = this.parse(currentJson);
        parsed[field] = value;
        return this.stringify(parsed.text, parsed.position, parsed.sections);
    }

    /**
     * Get a specific field from JSON content without parsing everything
     * @param {string} jsonContent - JSON content string
     * @param {string} field - Field to extract (text, position, sections)
     * @returns {*} Value of the specified field
     */
    static getField(jsonContent, field) {
        const parsed = this.parse(jsonContent);
        return parsed[field];
    }
}

// === USAGE EXAMPLES ===

/*

// SAVE A FILE (create or update)
const fileData = {
    boardId: "some-board-id",
    folderId: "some-folder-id",
    title: "My Document",
    text: "This is the main content...",
    position: { left: 100, top: 200 },
    sections: ["Introduction", "Details", "Conclusion"],
    bookmarks: [{ title: "Bookmark 1", url: "https://example.com" }]
};

const dbReadyObject = FileContentHelper.createFileObject(fileData);
// Save dbReadyObject to Appwrite database

// LOAD A FILE (read from database)
const dbFile = await databases.getDocument('main', 'files', fileId);
const parsedFile = FileContentHelper.parseFileObject(dbFile);
console.log(parsedFile.text);        // "This is the main content..."
console.log(parsedFile.position);    // { left: 100, top: 200 }
console.log(parsedFile.sections);    // ["Introduction", "Details", "Conclusion"]

// UPDATE POSITION ONLY (efficient for drag operations)
const currentContent = file.positionDatabaseField; // From DB query
const updatedContent = FileContentHelper.updateField(
    currentContent,
    'position',
    { left: newX, top: newY }
);
// Save only updatedContent back to database

*/

export default FileContentHelper;
