const fetch = require('node-fetch');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is not set in the environment variables.');
}

const GITHUB_API_URL = 'https://api.github.com/gists';

function logDebug(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
    console.log(`🔍 ${message}`);
    return logEntry;
}

function extractSchedule(content) {
    const lines = content.split('\n');
    const scheduleEntries = [];
    const debugInfo = [];
    let processedContent = '';

    lines.forEach((line, index) => {
        const debug = {
            lineNumber: index + 1,
            line: line,
            hasAt: line.includes('@'),
            hasTime: false,
            timeMatch: null,
            purpose: null,
            included: false,
            alreadyMarked: line.startsWith('✅')
        };

        // If already marked, extract the line without the checkmark
        if (debug.alreadyMarked) {
            const lineWithoutCheckmark = line.substring(2).trim();
            if (lineWithoutCheckmark.includes('@')) {
                const [purpose, timePart] = lineWithoutCheckmark.split('@');
                const timeMatch = timePart.match(/(\d{1,2}:\d{2}(?:am|pm))/);
                if (timeMatch) {
                    scheduleEntries.push({
                        purpose: purpose.trim(),
                        time: timeMatch[0]
                    });
                    debug.included = true;
                }
            }
            processedContent += `${line}\n`;
            debugInfo.push(debug);
            return;
        }

        if (line.includes('@')) {
            const [purpose, timePart] = line.split('@');
            debug.purpose = purpose.trim();
            
            // Check for time pattern
            const timeMatch = timePart.match(/(\d{1,2}:\d{2}(?:am|pm))/);
            if (timeMatch) {
                debug.hasTime = true;
                debug.timeMatch = timeMatch[0];
                scheduleEntries.push({
                    purpose: debug.purpose,
                    time: debug.timeMatch
                });
                debug.included = true;
                // Add checkbox emoji to included lines
                processedContent += `✅ ${line}\n`;
            } else {
                processedContent += `${line}\n`;
            }
        } else {
            processedContent += `${line}\n`;
        }

        debugInfo.push(debug);
    });

    return {
        entries: scheduleEntries,
        debug: debugInfo,
        processedContent: processedContent.trim()
    };
}

async function listGists() {
    const debugLogs = [];
    try {
        console.log('🚀 Starting gist processing...');
        debugLogs.push(logDebug('Starting gist processing'));

        const response = await fetch(GITHUB_API_URL, {
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const gists = await response.json();
        debugLogs.push(logDebug('Fetched gists list', { count: gists.length }));
        
        const targetGist = gists.find(gist => 
            Object.keys(gist.files).some(file => file === 'two_calendars.md')
        );

        if (targetGist) {
            console.log('🎯 Found target gist!');
            debugLogs.push(logDebug('Found target gist', { 
                id: targetGist.id,
                description: targetGist.description,
                files: Object.keys(targetGist.files)
            }));
            
            // Fetch and process each file
            const fileContents = await Promise.all(
                Object.entries(targetGist.files)
                    .filter(([filename]) => filename !== 'two_calendars.md' && filename !== 'debugging.md')
                    .map(async ([filename, fileInfo]) => {
                        const rawUrl = fileInfo.raw_url;
                        const response = await fetch(rawUrl);
                        const content = await response.text();
                        
                        // Process this file's content
                        const { entries: scheduleEntries, debug: extractionDebug, processedContent } = extractSchedule(content);
                        
                        debugLogs.push(logDebug(`Processed ${filename}`, { 
                            contentLength: content.length,
                            includedEntries: scheduleEntries.length
                        }));

                        return {
                            filename,
                            content: processedContent,
                            entries: scheduleEntries
                        };
                    })
            );

            // Create schedule section from all entries
            const allEntries = fileContents.flatMap(file => 
                file.entries.map(entry => ({
                    ...entry,
                    source: file.filename.replace('.md', '')
                }))
            );
            const scheduleSection = allEntries.length > 0 
                ? `\n## Schedule\n\n${allEntries.map(entry => `- [${entry.source}] ${entry.purpose} @ ${entry.time}`).join('\n')}\n`
                : '\n## Schedule\n\nNo schedule entries found.\n';

            // Prepare combined content for two_calendars.md
            const combinedContent = fileContents
                .map(file => `\n=== ${file.filename} ===\n${file.content}\n`)
                .join('\n');

            // Prepare files object for the update
            const files = {
                'two_calendars.md': {
                    content: combinedContent + scheduleSection
                },
                'debugging.md': {
                    content: '# Debug Logs\n\n' + debugLogs.join('\n')
                }
            };

            // Add processed files with checkmarks
            fileContents.forEach(file => {
                files[file.filename] = {
                    content: file.content
                };
            });

            // Update all files in one request
            const updateResponse = await fetch(`${GITHUB_API_URL}/${targetGist.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ files })
            });

            if (!updateResponse.ok) {
                const errorBody = await updateResponse.text();
                throw new Error(`Failed to update gist:
                    Status: ${updateResponse.status}
                    URL: ${GITHUB_API_URL}/${targetGist.id}
                    Response: ${errorBody}`);
            }

            console.log('✨ Successfully updated all files with checkmarks and schedule!');
            debugLogs.push(logDebug('Successfully updated all files'));
        } else {
            console.log('❌ No gist found containing two_calendars.md');
            debugLogs.push(logDebug('No target gist found'));
        }
    } catch (error) {
        console.error('💥 Error:', error.message);
        if (error.response) {
            console.error('Response details:', {
                status: error.response.status,
                statusText: error.response.statusText,
                headers: error.response.headers
            });
        }
        debugLogs.push(logDebug('Error occurred', { 
            message: error.message,
            stack: error.stack,
            response: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                headers: error.response.headers
            } : null
        }));
    }
}

listGists(); 