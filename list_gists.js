const fetch = require('node-fetch');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is not set in the environment variables.');
}

const GITHUB_API_URL = 'https://api.github.com/gists';

async function listGists() {
    try {
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
        
        const targetGist = gists.find(gist => 
            Object.keys(gist.files).some(file => file === 'two_calendars.md')
        );

        if (targetGist) {
            console.log('Found target gist:');
            console.log(`\nTitle: ${targetGist.description || 'No description'}`);
            console.log(`URL: ${targetGist.html_url}`);
            
            // Fetch the raw content of each file
            const fileContents = await Promise.all(
                Object.entries(targetGist.files)
                    .filter(([filename]) => filename !== 'two_calendars.md')
                    .map(async ([filename, fileInfo]) => {
                        const rawUrl = fileInfo.raw_url;
                        const response = await fetch(rawUrl);
                        const content = await response.text();
                        return `\n=== ${filename} ===\n${content}\n`;
                    })
            );

            const combinedContent = fileContents.join('\n');

            // Update the gist
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
                            content: combinedContent
                        }
                    }
                })
            });

            if (!updateResponse.ok) {
                throw new Error(`Failed to update gist: ${updateResponse.status}`);
            }

            console.log('\nSuccessfully updated two_calendars.md with combined content');
        } else {
            console.log('No gist found containing two_calendars.md');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

listGists(); 