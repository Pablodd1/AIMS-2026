// Function to get the client's local time zone
function getClientTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getCurrentDateGlobally(userTimezone) {
    const timeZone = userTimezone || getClientTimeZone();  // Get the client's time zone
    const options = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        timeZone: timeZone  // Use the client's time zone
    };

    const date = new Date();
    const formattedDate = new Intl.DateTimeFormat('en-US', options).format(date);
    const [month, day, year] = formattedDate.split('/');

    return `${month}-${day}-${year}`; // Return in MM-DD-YYYY format
}

function getCurrentTimeGlobally(userTimezone) {
    const timeZone = userTimezone || getClientTimeZone();  // Get the client's time zone
    const options = { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true,
        timeZone: timeZone  // Use the client's time zone
    };

    const date = new Date();
    return new Intl.DateTimeFormat('en-US', options).format(date); // Return formatted time
}

module.exports={
    getCurrentDateGlobally,
    getCurrentTimeGlobally,
    getClientTimeZone
}