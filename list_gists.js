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

    lines.forEach((line, index) => {
        const debug = {
            lineNumber: index + 1,
            line: line,
            hasAt: line.includes('@'),
            hasTime: false,
            timeMatch: null,
            purpose: null,
            included: false
        };

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
            }
        }

        debugInfo.push(debug);
    });

    return {
        entries: scheduleEntries,
        debug: debugInfo
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
            
            // Fetch the raw content of each file
            const fileContents = await Promise.all(
                Object.entries(targetGist.files)
                    .filter(([filename]) => filename !== 'two_calendars.md' && filename !== 'debugging.md')
                    .map(async ([filename, fileInfo]) => {
                        const rawUrl = fileInfo.raw_url;
                        const response = await fetch(rawUrl);
                        const content = await response.text();
                        debugLogs.push(logDebug(`Fetched content for ${filename}`, { 
                            contentLength: content.length 
                        }));
                        return `\n=== ${filename} ===\n${content}\n`;
                    })
            );

            const combinedContent = fileContents.join('\n');
            
            // Extract schedule entries with debug info
            const { entries: scheduleEntries, debug: extractionDebug } = extractSchedule(combinedContent);
            debugLogs.push(logDebug('Schedule extraction results', { 
                totalLines: extractionDebug.length,
                includedEntries: scheduleEntries.length,
                lineByLineDebug: extractionDebug
            }));
            
            // Create schedule section
            const scheduleSection = scheduleEntries.length > 0 
                ? `\n## Schedule\n\n${scheduleEntries.map(entry => `- ${entry.purpose} @ ${entry.time}`).join('\n')}\n`
                : '\n## Schedule\n\nNo schedule entries found.\n';

            // Combine everything for the main content
            const finalContent = combinedContent + scheduleSection;

            // Update the gist with separate files
            const updateResponse = await fetch(`${GITHUB_API_URL}/${targetGist.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: {
                        'two_calendars.md': {
                            content: finalContent
                        },
                        'debugging.md': {
                            content: '# Debug Logs\n\n' + debugLogs.join('\n')
                        }
                    }
                })
            });

            if (!updateResponse.ok) {
                throw new Error(`Failed to update gist: ${updateResponse.status}`);
            }

            console.log('✨ Successfully updated gist with content and debug logs!');
            debugLogs.push(logDebug('Successfully updated gist'));
        } else {
            console.log('❌ No gist found containing two_calendars.md');
            debugLogs.push(logDebug('No target gist found'));
        }
    } catch (error) {
        console.error('💥 Error:', error.message);
        debugLogs.push(logDebug('Error occurred', { 
            message: error.message,
            stack: error.stack 
        }));
    }
}

listGists(); 