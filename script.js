document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('searchButton');
    const wordInput = document.getElementById('wordInput');
    const resultContainer = document.querySelector('.result-container');
    const clearButton = document.getElementById('clearButton');
    let dictionary = {};

    function generateSalt() {
        return Math.random().toString(36).slice(2);
    }

    function generateMD5(string) {
        return CryptoJS.MD5(string).toString();
    }

    async function translateText(text) {
        try {
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.responseStatus === 200) {
                return data.responseData.translatedText;
            } else {
                throw new Error('Translation API error');
            }
        } catch (error) {
            console.error('Translation error:', error);
            return '翻译失败，请稍后重试';
        }
    }

    async function toggleTranslation(event) {
        const button = event.target;
        const translationDiv = button.nextElementSibling;
        const englishText = button.previousElementSibling.textContent;

        if (translationDiv.style.display === 'none') {
            button.textContent = '🔄 正在翻译...';
            button.disabled = true;

            try {
                const translation = await translateText(englishText);
                translationDiv.querySelector('p').textContent = translation;
                translationDiv.style.display = 'block';
                button.textContent = '🔄 隐藏翻译';
                button.classList.add('active');
            } catch (error) {
                console.error('Translation error:', error);
                button.textContent = '🔄 翻译失败';
                setTimeout(() => {
                    button.textContent = '🔄 重试翻译';
                    button.disabled = false;
                }, 2000);
                return;
            }

            button.disabled = false;
        } else {
            translationDiv.style.display = 'none';
            button.textContent = '🔄 显示翻译';
            button.classList.remove('active');
        }
    }

    async function getWordTranslation(word) {
        try {
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|zh`);
            const data = await response.json();
            return data.responseData.translatedText;
        } catch (error) {
            console.error('Translation error:', error);
            return '翻译失败';
        }
    }

    // Modify the fetch section to load both files
    Promise.all([
        fetch('IELTS-bank.txt')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load IELTS bank');
                }
                return response.text();
            })
            .catch(error => {
                console.error('Error loading IELTS bank:', error);
                return ''; // Return empty string if file fails to load
            }),
        fetch('TOEFL.txt')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load TOEFL bank');
                }
                return response.text();
            })
            .catch(error => {
                console.error('Error loading TOEFL bank:', error);
                return ''; // Return empty string if file fails to load
            })
    ])
        .then(([ieltsData, toeflData]) => {
            if (!ieltsData && !toeflData) {
                alert('Failed to load word banks. Please refresh the page.');
                return;
            }
            // Process IELTS data
            const ieltsLines = ieltsData.split('\n');
            // Process TOEFL data
            const toeflLines = toeflData.split('\n');

            // Create separate dictionaries for each
            let ieltsWordFrequency = {};
            let toeflWordFrequency = {};
            let currentIeltsSource = '';
            let currentToeflSource = '';
            let currentIeltsPassage = '';
            let currentToeflPassage = '';

            // Process IELTS data as before
            for (let i = 0; i < ieltsLines.length; i++) {
                const line = ieltsLines[i].trim();

                if (!line) continue;

                // Check if line is a source header (e.g., "C5-Test 3-Passage 3")
                const sourceMatch = line.match(/^(C\d+-Test \d+-(?:Part|Passage) \d+)$/);
                if (sourceMatch) {
                    currentIeltsSource = sourceMatch[1];
                    // Get the next line as the title
                    if (i + 1 < ieltsLines.length) {
                        currentIeltsPassage = ieltsLines[i + 1].trim();
                    }
                    continue;
                }

                // Check if line contains English words
                const isEnglish = /^[a-zA-Z]/.test(line);

                if (isEnglish) {
                    // Split into sentences
                    const sentences = line.match(/[^.!?]+[.!?]+/g) || [line];

                    sentences.forEach(sentence => {
                        const words = sentence.toLowerCase().match(/\b[a-zA-Z]+\b/g);
                        if (words) {
                            words.forEach(word => {
                                if (word.length > 2) { // Skip very short words
                                    ieltsWordFrequency[word] = (ieltsWordFrequency[word] || 0) + 1;

                                    if (!dictionary[word]) {
                                        dictionary[word] = {
                                            frequency: 0,
                                            ieltsExamples: [],
                                            toeflExamples: []
                                        };
                                    }

                                    dictionary[word].frequency = ieltsWordFrequency[word];

                                    // Add the sentence as an example with source
                                    const example = {
                                        english: sentence.trim(),
                                        source: currentIeltsSource,
                                        title: currentIeltsPassage
                                    };

                                    // Debug log
                                    console.log('Adding example:', {
                                        word,
                                        source: currentIeltsSource,
                                        title: currentIeltsPassage
                                    });

                                    // Check if this exact example already exists
                                    const isDuplicate = dictionary[word].ieltsExamples.some(
                                        ex => ex.english === example.english
                                    );

                                    if (!isDuplicate) {
                                        dictionary[word].ieltsExamples.push(example);
                                    }
                                }
                            });
                        }
                    });
                }
            }

            // Add similar processing for TOEFL data
            for (let i = 0; i < toeflLines.length; i++) {
                const line = toeflLines[i].trim();

                if (!line) continue;

                // Update the source matching pattern to capture the full source line
                const sourceMatch = line.match(/^(托福official\d+阅读第\d+篇\s+.*)/);
                if (sourceMatch) {
                    currentToeflSource = sourceMatch[1];
                    // Don't need to get the next line as title since it's included in the source
                    currentToeflPassage = '';
                    continue;
                }

                const isEnglish = /^[a-zA-Z]/.test(line);

                if (isEnglish) {
                    const sentences = line.match(/[^.!?]+[.!?]+/g) || [line];

                    sentences.forEach(sentence => {
                        const words = sentence.toLowerCase().match(/\b[a-zA-Z]+\b/g);
                        if (words) {
                            words.forEach(word => {
                                if (word.length > 2) {
                                    if (!dictionary[word]) {
                                        dictionary[word] = {
                                            frequency: 0,
                                            ieltsExamples: [],
                                            toeflExamples: []
                                        };
                                    }

                                    const example = {
                                        english: sentence.trim(),
                                        source: currentToeflSource,
                                        title: '' // We don't need separate title for TOEFL
                                    };

                                    const isDuplicate = dictionary[word].toeflExamples.some(
                                        ex => ex.english === example.english
                                    );

                                    if (!isDuplicate) {
                                        dictionary[word].toeflExamples.push(example);
                                    }
                                }
                            });
                        }
                    });
                }
            }
            console.log('Dictionary created:', dictionary);
        })
        .catch(error => {
            console.error('Error in data processing:', error);
            alert('An error occurred while loading the word banks. Please refresh the page.');
        });

    function highlightWord(text, word) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        return text.replace(regex, match => `<span class="highlight">${match}</span>`);
    }

    function getStarRating(frequency) {
        const stars = Math.min(5, frequency);  // Cap at 5 stars
        const filledStar = '⭐';
        const emptyStar = '☆';
        return filledStar.repeat(stars) + emptyStar.repeat(5 - stars);
    }

    function showResult(word) {
        const wordData = dictionary[word.toLowerCase()];
        if (!wordData || (wordData.ieltsExamples.length === 0 && wordData.toeflExamples.length === 0)) {
            alert('Word not found in our database ❌');
            return;
        }

        // Clear previous results
        document.getElementById('wordTitle').textContent = '';
        document.getElementById('ieltsExamples').innerHTML = '';
        document.getElementById('toeflExamples').innerHTML = '';

        // Remove any existing frequency badges
        const oldFrequencyBadges = document.querySelectorAll('.frequency-badge');
        oldFrequencyBadges.forEach(badge => badge.remove());

        // First show loading state
        document.getElementById('wordTitle').textContent = `${word} (正在翻译...) 📝`;

        // Get word translation
        getWordTranslation(word).then(translation => {
            // Update word title with translation
            document.getElementById('wordTitle').textContent = `${word} (${translation}) 📝`;

            // Add frequency information with stars for both IELTS and TOEFL
            const ieltsFrequency = wordData.ieltsExamples.length;
            const toeflFrequency = wordData.toeflExamples.length;
            const ieltsStars = getStarRating(ieltsFrequency);
            const toeflStars = getStarRating(toeflFrequency);

            const frequencyHtml = `
                <div class="frequency-badge">
                    <div class="frequency-grid">
                        <div class="frequency-item">
                            <div class="frequency-stars">${ieltsStars}</div>
                            <div class="frequency-count">Found ${ieltsFrequency} time${ieltsFrequency !== 1 ? 's' : ''} in IELTS</div>
                        </div>
                        <div class="frequency-item">
                            <div class="frequency-stars">${toeflStars}</div>
                            <div class="frequency-count">Found ${toeflFrequency} time${toeflFrequency !== 1 ? 's' : ''} in TOEFL</div>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('wordTitle').insertAdjacentHTML('afterend', frequencyHtml);

            // Display examples
            const ieltsContainer = document.getElementById('ieltsExamples');
            displayExamples(wordData.ieltsExamples, ieltsContainer, word);

            const toeflContainer = document.getElementById('toeflExamples');
            displayExamples(wordData.toeflExamples, toeflContainer, word);

            resultContainer.classList.add('visible');
        });
    }

    function displayExamples(examples, container, word) {
        container.innerHTML = examples.map((example, index) => {
            // For TOEFL examples, just use the source directly
            const sourceDisplay = example.source.includes('托福') ?
                example.source :
                `${example.source}${example.title ? ` - ${example.title}` : ''}`;

            return `
                <div class="example-item">
                    <div class="source-info">
                        <div class="example-number">${index + 1}</div>
                        <div class="source-tag">${sourceDisplay}</div>
                    </div>
                    <p>${highlightWord(example.english, word)}</p>
                    <button class="translation-toggle">🔄 显示翻译</button>
                    <div class="translation" style="display: none;">
                        <p>Loading translation...</p>
                    </div>
                </div>
            `;
        }).join('');

        // Add click event listeners to translation toggle buttons
        container.querySelectorAll('.translation-toggle').forEach(button => {
            button.addEventListener('click', toggleTranslation);
        });
    }

    searchButton.addEventListener('click', () => {
        const word = wordInput.value.trim();
        if (word) {
            showResult(word);
        }
    });

    wordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const word = wordInput.value.trim();
            if (word) {
                showResult(word);
            }
        }
    });

    // Show/hide clear button based on input content
    wordInput.addEventListener('input', () => {
        clearButton.style.display = wordInput.value ? 'block' : 'none';
    });

    // Clear input when x button is clicked
    clearButton.addEventListener('click', () => {
        wordInput.value = '';
        clearButton.style.display = 'none';
        wordInput.focus();
    });
});
