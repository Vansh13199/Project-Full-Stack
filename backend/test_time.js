const TIMETABLE_DATA = [
    { day: 'Tuesday', time: '11:20 - 12:10 PM', subjectCode: '24CST-205' },
    { day: 'Tuesday', time: '12:10 - 1:00 PM', subjectCode: '24CSH-206' },
    { day: 'Tuesday', time: '2:45 - 3:35 PM', subjectCode: '24TDP-291' }
];

function getMinutesFromMidnight(timeStr) {
    if (!timeStr) return 0;
    const match = timeStr.trim().match(/^(\d+):(\d+)\s+(AM|PM)$/);
    if (!match) return 0;
    let [_, hours, minutes, period] = match;
    hours = parseInt(hours, 10);
    minutes = parseInt(minutes, 10);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
}

TIMETABLE_DATA.forEach(slot => {
    const [startStr, endStr] = slot.time.split(" - ");
    let endPeriod = endStr.slice(-2); // "AM" or "PM"
    let startFixed = startStr.includes('AM') || startStr.includes('PM') ? startStr : `${startStr} ${endPeriod}`;
    if (startStr.startsWith('11:') && endPeriod === 'PM') startFixed = `${startStr} AM`;
    
    const startMins = getMinutesFromMidnight(startFixed);
    const endMins = getMinutesFromMidnight(endStr.trim());
    console.log(`${slot.time} -> Start: ${startFixed} (${startMins}), End: ${endStr.trim()} (${endMins})`);
});
