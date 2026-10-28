export const TRIP_TIME_ZONE = 'Asia/Kolkata';
export type TripStatus = 'upcoming' | 'ongoing' | 'completed' | 'unknown';
export function getTodayKey(now: Date = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: TRIP_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(now);
    const part = (type: string) => parts.find((item) => item.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
}
function isDateKey(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function getTripStatus(trip: {
    start_date: string;
    end_date: string;
}, today: string = getTodayKey()): TripStatus {
    if (!isDateKey(trip.start_date) || !isDateKey(trip.end_date) || trip.end_date < trip.start_date) {
        return 'unknown';
    }
    if (trip.end_date < today)
        return 'completed';
    if (trip.start_date > today)
        return 'upcoming';
    return 'ongoing';
}
export function isActiveTrip(trip: {
    start_date: string;
    end_date: string;
}, today: string = getTodayKey()): boolean {
    const status = getTripStatus(trip, today);
    return status === 'upcoming' || status === 'ongoing';
}
