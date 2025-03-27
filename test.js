const assert = require('assert');

function sortEntriesByTime(entries) {
    return entries.sort((a, b) => {
        const getTimeValue = (timeStr) => {
            const match = timeStr.match(/(\d+):(\d+)(am|pm)/);
            let hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const isPM = match[3] === 'pm';
            
            // Convert to 24-hour format
            if (hours === 12) {
                hours = isPM ? 12 : 0;  // 12am = 0, 12pm = 12
            } else if (isPM) {
                hours += 12;
            }
            
            // Convert to minutes since midnight
            return hours * 60 + minutes;
        };
        return getTimeValue(a.time) - getTimeValue(b.time);
    });
}

// Test cases
const tests = [
    {
        name: "Basic AM/PM sorting",
        input: [
            { time: "1:00pm", purpose: "Meeting 1" },
            { time: "9:00am", purpose: "Meeting 2" },
            { time: "2:00pm", purpose: "Meeting 3" }
        ],
        expected: [
            { time: "9:00am", purpose: "Meeting 2" },
            { time: "1:00pm", purpose: "Meeting 1" },
            { time: "2:00pm", purpose: "Meeting 3" }
        ]
    },
    {
        name: "Same hour different minutes",
        input: [
            { time: "1:30pm", purpose: "Meeting 1" },
            { time: "1:00pm", purpose: "Meeting 2" },
            { time: "1:15pm", purpose: "Meeting 3" }
        ],
        expected: [
            { time: "1:00pm", purpose: "Meeting 2" },
            { time: "1:15pm", purpose: "Meeting 3" },
            { time: "1:30pm", purpose: "Meeting 1" }
        ]
    },
    {
        name: "Single digit hours",
        input: [
            { time: "9:00am", purpose: "Meeting 1" },
            { time: "8:00am", purpose: "Meeting 2" },
            { time: "10:00am", purpose: "Meeting 3" }
        ],
        expected: [
            { time: "8:00am", purpose: "Meeting 2" },
            { time: "9:00am", purpose: "Meeting 1" },
            { time: "10:00am", purpose: "Meeting 3" }
        ]
    },
    {
        name: "Midnight and noon",
        input: [
            { time: "12:00pm", purpose: "Meeting 1" },
            { time: "12:00am", purpose: "Meeting 2" },
            { time: "1:00pm", purpose: "Meeting 3" }
        ],
        expected: [
            { time: "12:00am", purpose: "Meeting 2" },
            { time: "12:00pm", purpose: "Meeting 1" },
            { time: "1:00pm", purpose: "Meeting 3" }
        ]
    },
    {
        name: "Edge cases with 12",
        input: [
            { time: "11:00pm", purpose: "Meeting 1" },
            { time: "12:00am", purpose: "Meeting 2" },
            { time: "1:00am", purpose: "Meeting 3" }
        ],
        expected: [
            { time: "12:00am", purpose: "Meeting 2" },
            { time: "1:00am", purpose: "Meeting 3" },
            { time: "11:00pm", purpose: "Meeting 1" }
        ]
    }
];

// Run tests
tests.forEach(test => {
    console.log(`\nRunning test: ${test.name}`);
    const result = sortEntriesByTime([...test.input]);
    
    try {
        assert.deepStrictEqual(result, test.expected);
        console.log('✅ Test passed!');
    } catch (error) {
        console.error('❌ Test failed!');
        console.error('Expected:', test.expected);
        console.error('Got:', result);
        console.error('Error:', error.message);
    }
}); 