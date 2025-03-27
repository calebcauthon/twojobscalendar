export default {
  async fetch(request, env, ctx) {
    // Handle both local and production environments
    const GITHUB_TOKEN = env.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
    const GITHUB_API_URL = 'https://api.github.com/gists';

    if (!GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN is not set in environment variables');
      return new Response('GITHUB_TOKEN is not set in environment variables', { status: 500 });
    }

    // Log the token presence (but not the token itself) for debugging
    console.log('GITHUB_TOKEN is set:', !!GITHUB_TOKEN);

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

        if (debug.alreadyMarked) {
          const lineWithoutCheckmark = line.substring(2).trim();
          if (lineWithoutCheckmark.includes('@')) {
            const [purpose, timePart] = lineWithoutCheckmark.split('@');
            const timeMatch = timePart.match(/(\d{1,2}:\d{2}(?:am|pm))/);
            const dateMatch = timePart.match(/on\s+(\w+)\s+(\d{1,2}-\d{1,2})/i);
            if (timeMatch) {
              scheduleEntries.push({
                purpose: purpose.trim(),
                time: timeMatch[0],
                date: dateMatch ? `${dateMatch[1]} ${dateMatch[2]}` : null
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
          
          const timeMatch = timePart.match(/(\d{1,2}:\d{2}(?:am|pm))/);
          const dateMatch = timePart.match(/on\s+(\w+)\s+(\d{1,2}-\d{1,2})/i);
          if (timeMatch) {
            debug.hasTime = true;
            debug.timeMatch = timeMatch[0];
            scheduleEntries.push({
              purpose: debug.purpose,
              time: debug.timeMatch,
              date: dateMatch ? `${dateMatch[1]} ${dateMatch[2]}` : null
            });
            debug.included = true;
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

    const debugLogs = [];
    try {
      console.log('🚀 Starting gist processing...');
      debugLogs.push(logDebug('Starting gist processing'));

      const headers = {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'GistScheduler/1.0'
      }

      // Log request details
      const headersWithoutToken = { ...headers };
      delete headersWithoutToken['Authorization'];
      debugLogs.push(logDebug('Making request to GitHub API', {
        url: GITHUB_API_URL,
        headers: headersWithoutToken
      }));

      const response = await fetch(GITHUB_API_URL, {
        headers
      });

      // Log response details
      debugLogs.push(logDebug('GitHub API Response', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      }));

      if (!response.ok) {
        const errorBody = await response.text();
        debugLogs.push(logDebug('GitHub API Error Response', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody
        }));
        throw new Error(`HTTP error! status: ${response.status}\nResponse: ${errorBody}`);
      }

      const gists = await response.json();
      debugLogs.push(logDebug('Fetched gists list', { 
        count: gists.length,
        gistIds: gists.map(g => g.id)
      }));
      
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
        
        const fileContents = await Promise.all(
          Object.entries(targetGist.files)
            .filter(([filename]) => filename !== 'two_calendars.md' && filename !== 'debugging.md')
            .map(async ([filename, fileInfo]) => {
              const rawUrl = fileInfo.raw_url;
              const response = await fetch(rawUrl);
              const content = await response.text();
              
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

        const allEntries = fileContents.flatMap(file => 
          file.entries.map(entry => ({
            ...entry,
            source: file.filename.replace('.md', '')
          }))
        );

        const groupedEntries = allEntries.reduce((groups, entry) => {
          const date = entry.date || 'No Date';
          if (!groups[date]) {
            groups[date] = [];
          }
          groups[date].push(entry);
          return groups;
        }, {});

        const sortedDates = Object.keys(groupedEntries).sort((a, b) => {
          if (a === 'No Date') return 1;
          if (b === 'No Date') return -1;
          
          const getDateValue = (dateStr) => {
            const [weekday, monthDay] = dateStr.split(' ');
            const [monthNum, dayNum] = monthDay.split('-');
            return parseInt(monthNum) * 100 + parseInt(dayNum);
          };
          
          return getDateValue(a) - getDateValue(b);
        });

        const sortEntriesByTime = (entries) => {
          return entries.sort((a, b) => {
            const getTimeValue = (timeStr) => {
              const match = timeStr.match(/(\d+):(\d+)(am|pm)/);
              let hours = parseInt(match[1]);
              const minutes = parseInt(match[2]);
              const isPM = match[3] === 'pm';
              
              if (hours === 12) {
                hours = isPM ? 12 : 0;
              } else if (isPM) {
                hours += 12;
              }
              
              return hours * 60 + minutes;
            };
            return getTimeValue(a.time) - getTimeValue(b.time);
          });
        };

        const scheduleSection = allEntries.length > 0 
          ? `\n## Schedule\n\n${sortedDates
              .map(date => {
                const entries = sortEntriesByTime(groupedEntries[date]);
                const dateHeader = date === 'No Date' ? 'Unscheduled' : date;
                return `### ${dateHeader}\n\n${entries.map(entry => 
                  `- <span style="color: purple">[${entry.source}]</span> ${entry.purpose} @ ${entry.time}`
                ).join('\n')}\n`;
              })
              .join('\n')}\n`
          : '\n## Schedule\n\nNo schedule entries found.\n';

        const combinedContent = fileContents
          .map(file => `\n=== ${file.filename} ===\n${file.content}\n`)
          .join('\n');

        const files = {
          'two_calendars.md': {
            content: scheduleSection
          },
          'debugging.md': {
            content: '# Debug Logs\n\n' + debugLogs.join('\n')
          }
        };

        fileContents.forEach(file => {
          files[file.filename] = {
            content: file.content
          };
        });

        const updateResponse = await fetch(`${GITHUB_API_URL}/${targetGist.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
            'User-Agent': 'GistScheduler/1.0'
          },
          body: JSON.stringify({ files })
        });

        // Log update response details
        debugLogs.push(logDebug('GitHub API Update Response', {
          status: updateResponse.status,
          statusText: updateResponse.statusText,
          headers: Object.fromEntries(updateResponse.headers.entries())
        }));

        if (!updateResponse.ok) {
          const errorBody = await updateResponse.text();
          debugLogs.push(logDebug('GitHub API Update Error Response', {
            status: updateResponse.status,
            statusText: updateResponse.statusText,
            body: errorBody
          }));
          throw new Error(`Failed to update gist:
            Status: ${updateResponse.status}
            URL: ${GITHUB_API_URL}/${targetGist.id}
            Response: ${errorBody}`);
        }

        return new Response('Successfully updated all files with checkmarks and schedule!\n\nDebug Logs:\n' + debugLogs.join('\n'), {
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      } else {
        return new Response('No gist found containing two_calendars.md\n\nDebug Logs:\n' + debugLogs.join('\n'), { 
          status: 404,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    } catch (error) {
      console.error('💥 Error:', error.message);
      return new Response(`Error: ${error.message}\n\nDebug Logs:\n${debugLogs.join('\n')}`, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
}; 