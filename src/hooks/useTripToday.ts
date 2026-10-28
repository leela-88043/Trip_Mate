import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getTodayKey } from '@/utils/tripTimeline';
export function useTripToday(): string {
    const [today, setToday] = useState(() => getTodayKey());
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const update = () => {
            setToday(getTodayKey());
            if (timer)
                clearTimeout(timer);
            // India is UTC+05:30 throughout the year. Schedule the next midnight.
            const now = new Date();
            const indiaNow = new Date(now.getTime() + 330 * 60 * 1000);
            const nextMidnight = Date.UTC(indiaNow.getUTCFullYear(), indiaNow.getUTCMonth(), indiaNow.getUTCDate() + 1) - 330 * 60 * 1000;
            timer = setTimeout(update, Math.max(1000, nextMidnight - now.getTime() + 100));
        };
        update();
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active')
                update();
        });
        return () => {
            if (timer)
                clearTimeout(timer);
            subscription.remove();
        };
    }, []);
    return today;
}
