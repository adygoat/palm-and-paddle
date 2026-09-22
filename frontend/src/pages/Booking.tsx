import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  FormEvent,
} from 'react';

import Navbar from '../components/Navbar';
import { apiRequest } from '../api';

interface Slot {
  startTime: string;
  endTime: string;
  available: boolean;
}

interface AvailabilityResponse {
  courtId: string;
  date: string;
  slots: Slot[];
}

interface BookingResponse {
  id: string;
  reference: string;
  status: string;
  courtIds: string[];
  totalPrice: number;
  message: string;
}

const COURTS = [
  {
    id: 'court-1',
    name: 'Court 1',
  },
  {
    id: 'court-2',
    name: 'Court 2',
  },
];

function displayTime(
  time: string,
) {
  if (time === '00:00') {
    return '12:00 AM';
  }

  let hour = Number(
    time.split(':')[0],
  );

  const suffix =
    hour >= 12
      ? 'PM'
      : 'AM';

  hour =
    hour % 12 || 12;

  return `${hour}:00 ${suffix}`;
}

function todayString() {
  const now = new Date();

  const local =
    new Date(
      now.getTime() -
        now.getTimezoneOffset() *
          60000,
    );

  return local
    .toISOString()
    .slice(0, 10);
}

export default function Booking() {
  const [
    courtIds,
    setCourtIds,
  ] = useState<string[]>([
    'court-1',
  ]);

  const [
    date,
    setDate,
  ] = useState('');

  const [
    combinedSlots,
    setCombinedSlots,
  ] = useState<Slot[]>([]);

  const [
    startTime,
    setStartTime,
  ] = useState('');

  const [
    endTime,
    setEndTime,
  ] = useState('');

  const [
    customerName,
    setCustomerName,
  ] = useState('');

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    phone,
    setPhone,
  ] = useState('');

  const [
    notes,
    setNotes,
  ] = useState('');

  const [
    loadingAvailability,
    setLoadingAvailability,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    success,
    setSuccess,
  ] =
    useState<BookingResponse | null>(
      null,
    );

  function toggleCourt(
  courtId: string,
) {
  setCourtIds(
    (current) => {
      if (
        current.includes(
          courtId,
        )
      ) {
        return current.filter(
          (id) =>
            id !== courtId,
        );
      }

      return [
        ...current,
        courtId,
      ];
    },
  );
}

  useEffect(() => {
    setStartTime('');
    setEndTime('');
    setSuccess(null);

    if (
      !date ||
      courtIds.length === 0
    ) {
      setCombinedSlots([]);
      return;
    }

    async function loadAvailability() {
      setLoadingAvailability(
        true,
      );

      setError('');

      try {
        const results =
          await Promise.all(
            courtIds.map(
              (courtId) =>
                apiRequest<AvailabilityResponse>(
                  `/availability?courtId=${encodeURIComponent(
                    courtId,
                  )}&date=${encodeURIComponent(
                    date,
                  )}`,
                ),
            ),
          );

        const first =
          results[0];

        if (!first) {
          setCombinedSlots([]);
          return;
        }

        const combined =
          first.slots.map(
            (slot) => {
              const available =
                results.every(
                  (court) => {
                    const matching =
                      court.slots.find(
                        (item) =>
                          item.startTime ===
                          slot.startTime,
                      );

                    return (
                      matching?.available ===
                      true
                    );
                  },
                );

              return {
                ...slot,
                available,
              };
            },
          );

        setCombinedSlots(
          combined,
        );
      } catch (err) {
        setCombinedSlots([]);

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load availability.',
        );
      } finally {
        setLoadingAvailability(
          false,
        );
      }
    }

    void loadAvailability();
  }, [courtIds, date]);

  function handleSlotClick(
    clickedIndex: number,
  ) {
    const clickedSlot =
      combinedSlots[clickedIndex];

    if (
      !clickedSlot ||
      !clickedSlot.available
    ) {
      return;
    }

    setSuccess(null);

    // No range selected yet.
    if (!startTime) {
      setStartTime(
        clickedSlot.startTime,
      );

      setEndTime(
        clickedSlot.endTime,
      );

      setError('');

      return;
    }

    const startIndex =
      combinedSlots.findIndex(
        (slot) =>
          slot.startTime ===
          startTime,
      );

    /*
     * Clicking the first selected slot again
     * clears the selection.
     */
    if (
      clickedIndex === startIndex &&
      endTime === clickedSlot.endTime
    ) {
      setStartTime('');
      setEndTime('');
      setError('');

      return;
    }

    /*
     * Clicking an earlier hour starts
     * a brand-new selection from that hour.
     */
    if (
      clickedIndex <
      startIndex
    ) {
      setStartTime(
        clickedSlot.startTime,
      );

      setEndTime(
        clickedSlot.endTime,
      );

      setError('');

      return;
    }

    /*
     * Ensure every hour between the
     * starting slot and clicked slot
     * is available.
     */
    const selectedRange =
      combinedSlots.slice(
        startIndex,
        clickedIndex + 1,
      );

    const allAvailable =
      selectedRange.every(
        (slot) =>
          slot.available,
      );

    if (!allAvailable) {
      setError(
        'Your selected range contains an unavailable time slot.',
      );

      return;
    }

    setEndTime(
      clickedSlot.endTime,
    );

    setError('');
  }

  function clearTimeSelection() {
    setStartTime('');
    setEndTime('');
    setError('');
  }

  const selectedStartIndex =
    useMemo(
      () =>
        combinedSlots.findIndex(
          (slot) =>
            slot.startTime ===
            startTime,
        ),
      [
        combinedSlots,
        startTime,
      ],
    );

  const selectedEndIndex =
    useMemo(() => {
      if (!endTime) {
        return -1;
      }

      return combinedSlots.findIndex(
        (slot) =>
          slot.endTime ===
          endTime,
      );
    }, [
      combinedSlots,
      endTime,
    ]);

  const priceBreakdown =
    useMemo(() => {
      if (
        !startTime ||
        !endTime
      ) {
        return null;
      }

      const start =
        Number(
          startTime.split(
            ':',
          )[0],
        );

      let end =
        Number(
          endTime.split(
            ':',
          )[0],
        );

      if (
        endTime === '00:00'
      ) {
        end = 24;
      }

      let dayHours = 0;
      let eveningHours = 0;

      for (
        let hour = start;
        hour < end;
        hour++
      ) {
        if (
          hour >= 6 &&
          hour < 18
        ) {
          dayHours++;
        } else {
          eveningHours++;
        }
      }

      const courtCount =
        courtIds.length;

      const daySubtotal =
        dayHours *
        250 *
        courtCount;

      const eveningSubtotal =
        eveningHours *
        300 *
        courtCount;

      return {
        courtCount,
        dayHours,
        eveningHours,
        daySubtotal,
        eveningSubtotal,
        total:
          daySubtotal +
          eveningSubtotal,
      };
    }, [
      courtIds,
      startTime,
      endTime,
    ]);

  async function submitBooking(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      courtIds.length === 0
    ) {
      setError(
        'Please select at least one court.',
      );

      return;
    }

    if (
      !startTime ||
      !endTime
    ) {
      setError(
        'Please select your booking time.',
      );

      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess(null);

    try {
      const result =
        await apiRequest<BookingResponse>(
          '/bookings',
          {
            method: 'POST',

            body:
              JSON.stringify({
                customerName,
                email,
                phone,
                courtIds,
                date,
                startTime,
                endTime,

                ...(notes.trim()
                  ? {
                      notes:
                        notes.trim(),
                    }
                  : {}),
              }),
          },
        );

      setSuccess(result);

      setCustomerName('');
      setEmail('');
      setPhone('');
      setNotes('');

      setStartTime('');
      setEndTime('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Booking failed.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <Navbar />

      <section className="booking-hero">
        <span className="eyebrow">
          COURT RESERVATION
        </span>

        <h1>
          Book your game.
        </h1>

        <p>
          Select one or both courts,
          choose your available hours,
          and see your total before
          submitting.
        </p>
      </section>

      <section className="booking-layout">
        <form
          className="booking-card"
          onSubmit={
            submitBooking
          }
        >
          <div className="form-section-title">
            <span>1</span>

            <div>
              <h2>
                Select courts
              </h2>

              <p>
                Choose one court or
                reserve both.
              </p>
            </div>
          </div>

          <div className="court-selector">
            {COURTS.map(
              (court) => {
                const selected =
                  courtIds.includes(
                    court.id,
                  );

                return (
                  <button
                    type="button"
                    key={
                      court.id
                    }
                    className={
                      selected
                        ? 'court-option court-selected'
                        : 'court-option'
                    }
                    onClick={() =>
                      toggleCourt(
                        court.id,
                      )
                    }
                  >
                    <div className="court-check">
                      {selected
                        ? '✓'
                        : ''}
                    </div>

                    <div>
                      <strong>
                        {
                          court.name
                        }
                      </strong>

                      <span>
                        Tap to{' '}
                        {selected
                          ? 'deselect'
                          : 'select'}
                      </span>
                    </div>
                  </button>
                );
              },
            )}
          </div>

          <div className="form-divider" />

          <div className="form-section-title">
            <span>2</span>

            <div>
              <h2>
                Choose schedule
              </h2>

              <p>
                Select the date, then
                tap an hour to start
                your booking and tap
                another hour to extend
                the range.
              </p>
            </div>
          </div>

          <label>
            Date

            <input
              type="date"
              min={todayString()}
              value={date}
              onChange={(
                event,
              ) =>
                setDate(
                  event.target
                    .value,
                )
              }
              required
            />
          </label>

          {date && (
            <div className="availability-panel">
              <div className="availability-title">
                <div>
                  <h3>
                    Availability
                  </h3>

                  <p>
                    {courtIds.length ===
                    2
                      ? 'Showing hours when BOTH courts are available.'
                      : 'Showing available hours for your selected court.'}
                  </p>

                  <p className="slot-instruction">
                    Tap an available
                    hour to select it.
                    Tap a later hour to
                    select the whole
                    range.
                  </p>
                </div>
              </div>

              {loadingAvailability ? (
                <p className="muted">
                  Checking
                  availability...
                </p>
              ) : (
                <div className="slot-grid">
                  {combinedSlots.map(
                    (
                      slot,
                      index,
                    ) => {
                      const selected =
                        selectedStartIndex >=
                          0 &&
                        selectedEndIndex >=
                          selectedStartIndex &&
                        index >=
                          selectedStartIndex &&
                        index <=
                          selectedEndIndex;

                      return (
                        <button
                          key={
                            slot.startTime
                          }
                          type="button"
                          disabled={
                            !slot.available
                          }
                          className={[
                            'slot',
                            slot.available
                              ? 'slot-available'
                              : 'slot-booked',
                            selected
                              ? 'slot-selected'
                              : '',
                          ].join(
                            ' ',
                          )}
                          onClick={() =>
                            handleSlotClick(
                              index,
                            )
                          }
                        >
                          <strong>
                            {displayTime(
                              slot.startTime,
                            )}
                          </strong>

                          <span>
                            to{' '}
                            {displayTime(
                              slot.endTime,
                            )}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          )}

          {startTime &&
            endTime && (
              <div className="selected-time-summary">
                <div>
                  <span>
                    SELECTED TIME
                  </span>

                  <strong>
                    {displayTime(
                      startTime,
                    )}
                    {' – '}
                    {displayTime(
                      endTime,
                    )}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={
                    clearTimeSelection
                  }
                >
                  Clear
                </button>
              </div>
            )}

          {priceBreakdown && (
            <div className="price-card">
              <div className="price-header">
                <div>
                  <span className="eyebrow">
                    PRICE BREAKDOWN
                  </span>

                  <h3>
                    Booking Total
                  </h3>
                </div>

                <strong className="price-big">
                  ₱
                  {priceBreakdown.total.toLocaleString()}
                </strong>
              </div>

              <div className="price-row">
                <span>
                  Courts
                </span>

                <strong>
                  {
                    priceBreakdown.courtCount
                  }
                </strong>
              </div>

              {priceBreakdown.dayHours >
                0 && (
                <div className="price-row">
                  <span>
                    6 AM – 5 PM

                    <small>
                      {
                        priceBreakdown.dayHours
                      }{' '}
                      hr × ₱250 ×{' '}
                      {
                        priceBreakdown.courtCount
                      }{' '}
                      court
                      {priceBreakdown.courtCount >
                      1
                        ? 's'
                        : ''}
                    </small>
                  </span>

                  <strong>
                    ₱
                    {priceBreakdown.daySubtotal.toLocaleString()}
                  </strong>
                </div>
              )}

              {priceBreakdown.eveningHours >
                0 && (
                <div className="price-row">
                  <span>
                    4 PM – 12 AM

                    <small>
                      {
                        priceBreakdown.eveningHours
                      }{' '}
                      hr × ₱300 ×{' '}
                      {
                        priceBreakdown.courtCount
                      }{' '}
                      court
                      {priceBreakdown.courtCount >
                      1
                        ? 's'
                        : ''}
                    </small>
                  </span>

                  <strong>
                    ₱
                    {priceBreakdown.eveningSubtotal.toLocaleString()}
                  </strong>
                </div>
              )}

              <div className="price-total">
                <span>
                  Total
                </span>

                <strong>
                  ₱
                  {priceBreakdown.total.toLocaleString()}
                </strong>
              </div>
            </div>
          )}

          <div className="form-divider" />

          <div className="form-section-title">
            <span>3</span>

            <div>
              <h2>
                Your details
              </h2>

              <p>
                Enter your contact
                information.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Full name

              <input
                type="text"
                value={
                  customerName
                }
                onChange={(
                  event,
                ) =>
                  setCustomerName(
                    event.target
                      .value,
                  )
                }
                placeholder="Your full name"
                required
              />
            </label>

            <label>
              Phone number

              <input
                type="tel"
                value={phone}
                onChange={(
                  event,
                ) =>
                  setPhone(
                    event.target
                      .value,
                  )
                }
                placeholder="09xxxxxxxxx"
                required
              />
            </label>
          </div>

          <label>
            Email address

            <input
              type="email"
              value={email}
              onChange={(
                event,
              ) =>
                setEmail(
                  event.target
                    .value,
                )
              }
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Notes

            <span className="optional">
              Optional
            </span>

            <textarea
              value={notes}
              onChange={(
                event,
              ) =>
                setNotes(
                  event.target
                    .value,
                )
              }
              placeholder="Additional requests..."
            />
          </label>

          {error && (
            <div className="alert error-alert">
              {error}
            </div>
          )}

          {success && (
            <div className="alert success-alert">
              <strong>
                Booking request
                submitted!
              </strong>

              <span>
                Reference:{' '}
                <b>
                  {
                    success.reference
                  }
                </b>
              </span>

              <span>
                Total: ₱
                {success.totalPrice.toLocaleString()}
              </span>

              <span>
                Please wait for your
                confirmation email.
              </span>
            </div>
          )}

          <button
            className="primary-button submit-button"
            type="submit"
            disabled={
              submitting
            }
          >
            {submitting
              ? 'Submitting...'
              : priceBreakdown
                ? `Request Booking • ₱${priceBreakdown.total.toLocaleString()}`
                : 'Request Booking'}
          </button>

          <p className="booking-disclaimer">
            Your booking remains
            PENDING until confirmed by
            Palm & Paddle Pickleball Court by Chocs & Dwacks.
          </p>
        </form>

        <aside className="booking-sidebar">
          <img
            src="/palm-paddle-logo.png"
            alt="Palm & Paddle"
          />

          <h2>
            Court Rates
          </h2>

          <div className="sidebar-rate">
            <span>
              6 AM – 5 PM
            </span>

            <strong>
              ₱250/hr
            </strong>
          </div>

          <div className="sidebar-rate">
            <span>
              4 PM – 12 AM
            </span>

            <strong>
              ₱300/hr
            </strong>
          </div>

          <p className="sidebar-note">
            Rates are per court,
            per hour.
          </p>

          <div className="side-divider" />

          <h3>
            Booking Information
          </h3>

          <ul>
            <li>
              Reserve 1 or 2 courts.
            </li>

            <li>
              Tap the time blocks to
              choose your booking range.
            </li>

            <li>
              Book multiple consecutive
              hours.
            </li>

            <li>
              Unavailable hours cannot
              be selected.
            </li>

            <li>
              Final confirmation is
              sent through email.
            </li>
          </ul>
        </aside>
      </section>
    </main>
  );
}