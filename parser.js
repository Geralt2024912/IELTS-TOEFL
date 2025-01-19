const fs = require('fs');

// Read the IELTS bank file
fs.readFile('IELTS bank.txt', 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }

    // Split the file into lines
    const lines = data.split('\n');
    const dictionary = {};
    let currentWord = null;
    let currentExample = null;

    // Process each line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;

        // Check if line contains English words (basic check for now)
        const isEnglish = /^[a-zA-Z]/.test(line);
        const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';

        if (isEnglish) {
            // Extract words from the English line
            const words = line.toLowerCase().match(/\b[a-zA-Z]+\b/g);
            if (words) {
                words.forEach(word => {
                    if (word.length > 2) { // Skip very short words
                        if (!dictionary[word]) {
                            dictionary[word] = {
                                translation: '',
                                pronunciation: '', // We'll need to add this manually or from another source
                                ieltsExamples: [],
                                phrases: [],
                                idioms: []
                            };
                        }
                        
                        // Add the full sentence as an example
                        if (nextLine && /[\u4e00-\u9fa5]/.test(nextLine)) { // Check if next line is Chinese
                            dictionary[word].ieltsExamples.push({
                                english: line,
                                chinese: nextLine
                            });
                        }
                    }
                });
            }
        }
    }

    // Write the dictionary to a JSON file
    fs.writeFile('ielts_dictionary.json', JSON.stringify(dictionary, null, 2), 'utf8', (err) => {
        if (err) {
            console.error('Error writing dictionary file:', err);
            return;
        }
        console.log('Dictionary has been created successfully!');
    });
});
