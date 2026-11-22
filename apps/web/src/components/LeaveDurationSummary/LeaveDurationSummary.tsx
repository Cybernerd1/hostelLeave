import { useEffect, useState } from 'react';
import { leaveApi } from '@/services/leave.service';
import { useFeedback } from '@/components/ui/FeedbackProvider';
import './LeaveDurationSummary.css';

export interface LeaveDurationSummaryProps {
  fromDate: string;
  toDate: string;
}

interface DayBreakdown {
  workingDays: string[];
  weekends: string[];
  holidays: { date: string; type: string; name: string }[];
  vacations: { date: string; type: string; name: string }[];
  others: { date: string; type: string; name: string }[];
}

export function LeaveDurationSummary({ fromDate, toDate }: LeaveDurationSummaryProps) {
  const { error: showError } = useFeedback();
  const [breakdown, setBreakdown] = useState<DayBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const loadBreakdown = async () => {
      setLoading(true);
      try {
        const classification = await leaveApi.classifyDates(fromDate, toDate);

        // Parse the classification to build day breakdown
        const dayMap = new Map<string, { type: string; name: string }>();
        if (classification && typeof classification === 'object') {
          Object.entries(classification).forEach(([day, typeOrObj]: any) => {
            if (typeof typeOrObj === 'string') {
              dayMap.set(day, { type: typeOrObj, name: typeOrObj });
            } else if (typeOrObj && typeof typeOrObj === 'object') {
              dayMap.set(day, {
                type: typeOrObj.type || 'other',
                name: typeOrObj.name || typeOrObj.type || 'other',
              });
            }
          });
        }

        // Classify each date
        const start = new Date(`${fromDate}T00:00:00Z`);
        const end = new Date(`${toDate}T00:00:00Z`);
        const breakdown: DayBreakdown = {
          workingDays: [],
          weekends: [],
          holidays: [],
          vacations: [],
          others: [],
        };

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().slice(0, 10);
          const info = dayMap.get(dateStr);
          const dayOfWeek = d.getUTCDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          if (isWeekend) {
            breakdown.weekends.push(dateStr);
          } else if (info) {
            if (info.type.includes('holiday') || info.type === 'public_holiday' || info.type === 'institutional') {
              breakdown.holidays.push({ date: dateStr, ...info });
            } else if (info.type.includes('vacation') || info.type === 'semester_break') {
              breakdown.vacations.push({ date: dateStr, ...info });
            } else {
              breakdown.others.push({ date: dateStr, ...info });
            }
          } else {
            breakdown.workingDays.push(dateStr);
          }
        }

        setBreakdown(breakdown);
      } catch (err) {
        console.error('Failed to classify leave dates:', err);
        // Create a simple breakdown if classification fails
        const start = new Date(`${fromDate}T00:00:00Z`);
        const end = new Date(`${toDate}T00:00:00Z`);
        const breakdown: DayBreakdown = {
          workingDays: [],
          weekends: [],
          holidays: [],
          vacations: [],
          others: [],
        };

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().slice(0, 10);
          const dayOfWeek = d.getUTCDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            breakdown.weekends.push(dateStr);
          } else {
            breakdown.workingDays.push(dateStr);
          }
        }

        setBreakdown(breakdown);
      } finally {
        setLoading(false);
      }
    };

    loadBreakdown();
  }, [fromDate, toDate]);

  if (loading) {
    return <div className="leave-duration-loading">Calculating leave duration...</div>;
  }

  if (!breakdown) {
    return <div className="leave-duration-error">Unable to calculate leave duration.</div>;
  }

  const totalDays =
    breakdown.workingDays.length +
    breakdown.weekends.length +
    breakdown.holidays.length +
    breakdown.vacations.length +
    breakdown.others.length;

  const workingDays = breakdown.workingDays.length;
  const nonWorkingDays = breakdown.weekends.length + breakdown.holidays.length + breakdown.vacations.length;

  return (
    <div className="leave-duration-summary">
      <div className="leave-duration-header">
        <div>
          <div className="leave-duration-period">
            {new Date(fromDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: 'UTC',
            })}{' '}
            –{' '}
            {new Date(toDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: 'UTC',
            })}
          </div>
          <div className="leave-duration-subtitle">Leave Duration Breakdown</div>
        </div>
        <button
          className="leave-duration-toggle"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? '▼' : '▶'}
        </button>
      </div>

      <div className="leave-duration-summary-table">
        <div className="leave-duration-row">
          <div className="leave-duration-label">Total calendar days</div>
          <div className="leave-duration-value">{totalDays}</div>
        </div>
        <div className="leave-duration-row">
          <div className="leave-duration-label">Working days</div>
          <div className="leave-duration-value" style={{ color: '#1d4ed8' }}>
            {workingDays}
          </div>
        </div>
        <div className="leave-duration-row">
          <div className="leave-duration-label">Weekends</div>
          <div className="leave-duration-value" style={{ color: '#7c3aed' }}>
            {breakdown.weekends.length}
          </div>
        </div>
        {breakdown.holidays.length > 0 && (
          <div className="leave-duration-row">
            <div className="leave-duration-label">Public/Institutional holidays</div>
            <div className="leave-duration-value" style={{ color: '#dc2626' }}>
              {breakdown.holidays.length}
            </div>
          </div>
        )}
        {breakdown.vacations.length > 0 && (
          <div className="leave-duration-row">
            <div className="leave-duration-label">Vacation/Break periods</div>
            <div className="leave-duration-value" style={{ color: '#ea580c' }}>
              {breakdown.vacations.length}
            </div>
          </div>
        )}
        {breakdown.others.length > 0 && (
          <div className="leave-duration-row">
            <div className="leave-duration-label">Other calendar events</div>
            <div className="leave-duration-value" style={{ color: '#059669' }}>
              {breakdown.others.length}
            </div>
          </div>
        )}
      </div>

      {expanded && (
        <div className="leave-duration-details">
          {breakdown.workingDays.length > 0 && (
            <div className="leave-duration-detail-section">
              <h4>Working Days ({breakdown.workingDays.length})</h4>
              <div className="leave-duration-date-list">
                {breakdown.workingDays.map((date) => (
                  <span key={date} className="leave-duration-date">
                    {new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </span>
                ))}
              </div>
            </div>
          )}

          {breakdown.weekends.length > 0 && (
            <div className="leave-duration-detail-section">
              <h4>Weekends ({breakdown.weekends.length})</h4>
              <div className="leave-duration-date-list">
                {breakdown.weekends.map((date) => (
                  <span key={date} className="leave-duration-date leave-duration-date--weekend">
                    {new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </span>
                ))}
              </div>
            </div>
          )}

          {breakdown.holidays.length > 0 && (
            <div className="leave-duration-detail-section">
              <h4>Holidays ({breakdown.holidays.length})</h4>
              <div className="leave-duration-date-list">
                {breakdown.holidays.map((item) => (
                  <div key={item.date} className="leave-duration-event">
                    <span className="leave-duration-date leave-duration-date--holiday">
                      {new Date(`${item.date}T00:00:00Z`).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </span>
                    <span className="leave-duration-event-name">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {breakdown.vacations.length > 0 && (
            <div className="leave-duration-detail-section">
              <h4>Vacations & Breaks ({breakdown.vacations.length})</h4>
              <div className="leave-duration-date-list">
                {breakdown.vacations.map((item) => (
                  <div key={item.date} className="leave-duration-event">
                    <span className="leave-duration-date leave-duration-date--vacation">
                      {new Date(`${item.date}T00:00:00Z`).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </span>
                    <span className="leave-duration-event-name">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {breakdown.others.length > 0 && (
            <div className="leave-duration-detail-section">
              <h4>Other Events ({breakdown.others.length})</h4>
              <div className="leave-duration-date-list">
                {breakdown.others.map((item) => (
                  <div key={item.date} className="leave-duration-event">
                    <span className="leave-duration-date leave-duration-date--other">
                      {new Date(`${item.date}T00:00:00Z`).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </span>
                    <span className="leave-duration-event-name">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
