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
            console.log(`Created: ${new Date(targetGist.created_at).toLocaleDateString()}`);
            console.log('Files:');
            Object.keys(targetGist.files).forEach(file => {
                console.log(`  - ${file}`);
            });
        } else {
            console.log('No gist found containing two_calendars.md');
        }
    } catch (error) {
        console.error('Error fetching gists:', error.message);
    }
}

listGists(); 