import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';

import {
  useNavigate,
} from 'react-router-dom';

import { apiRequest } from '../api';
import { auth } from '../firebase';

type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED';

type ScheduleStatus =
  | 'OPEN'
  | 'BOOKED'
  | 'BLOCKED';

interface Booking {
  id: string;

  reference: string;

  customerName: string;

  email: string;

  phone: string;

  courtIds?: string[];

  courtId?: string;

  date: string;

  startTime: string;

  endTime: string;

  totalPrice?: number;

  securityDeposit?: number;

  remainingBalance?: number;

  depositStatus?:
  | 'UNPAID'
  | 'VERIFIED';

  depositPaidAmount?: number;

  status: BookingStatus;

  notes?: string;
}

interface AdminScheduleSlot {
  startTime: string;
  endTime: string;
  status: ScheduleStatus;
}

interface AdminScheduleResponse {
  courtId: string;
  date: string;
  slots: AdminScheduleSlot[];
}

function displayCourt(
  courtId: string,
) {
  if (
    courtId === 'court-1'
  ) {
    return 'Court 1';
  }

  if (
    courtId === 'court-2'
  ) {
    return 'Court 2';
  }

  return courtId;
}

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

export default function AdminDashboard() {
  const navigate =
    useNavigate();

  /*
   * ==========================
   * BOOKINGS
   * ==========================
   */

  const [
    bookings,
    setBookings,
  ] =
    useState<Booking[]>([]);

  const [
    filter,
    setFilter,
  ] =
    useState<
      'ALL' | BookingStatus
    >('ALL');

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    updatingId,
    setUpdatingId,
  ] = useState('');

  /*
   * ==========================
   * COURT SCHEDULE
   * ==========================
   */

  const [
    scheduleCourtId,
    setScheduleCourtId,
  ] =
    useState('court-1');

  const [
    scheduleDate,
    setScheduleDate,
  ] =
    useState(
      todayString(),
    );

  const [
    scheduleSlots,
    setScheduleSlots,
  ] =
    useState<
      AdminScheduleSlot[]
    >([]);

  const [
    scheduleLoading,
    setScheduleLoading,
  ] =
    useState(false);

  const [
    selectedScheduleStart,
    setSelectedScheduleStart,
  ] =
    useState('');

  const [
    selectedScheduleEnd,
    setSelectedScheduleEnd,
  ] =
    useState('');

  const [
    scheduleMessage,
    setScheduleMessage,
  ] =
    useState('');

  const [
    scheduleUpdating,
    setScheduleUpdating,
  ] =
    useState(false);

  /*
   * ==========================
   * GENERAL ERROR
   * ==========================
   */

  const [
    error,
    setError,
  ] = useState('');

  /*
   * ==========================
   * LOAD BOOKINGS
   * ==========================
   */

  const loadBookings =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError('');

          const data =
            await apiRequest<
              Booking[]
            >(
              '/admin/bookings',
              {},
              true,
            );

          setBookings(
            data,
          );
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load bookings.',
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  /*
   * ==========================
   * LOAD COURT SCHEDULE
   * ==========================
   */

  const loadSchedule =
    useCallback(
      async () => {
        if (
          !scheduleCourtId ||
          !scheduleDate
        ) {
          return;
        }

        try {
          setScheduleLoading(
            true,
          );

          setError('');

          const data =
            await apiRequest<
              AdminScheduleResponse
            >(
              `/admin/bookings/schedule?courtId=${encodeURIComponent(
                scheduleCourtId,
              )}&date=${encodeURIComponent(
                scheduleDate,
              )}`,
              {},
              true,
            );

          setScheduleSlots(
            data.slots,
          );

          setSelectedScheduleStart(
            '',
          );

          setSelectedScheduleEnd(
            '',
          );
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load court schedule.',
          );
        } finally {
          setScheduleLoading(
            false,
          );
        }
      },
      [
        scheduleCourtId,
        scheduleDate,
      ],
    );

  /*
   * ==========================
   * AUTH
   * ==========================
   */

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      (user) => {
        if (!user) {
          navigate(
            '/admin/login',
            {
              replace: true,
            },
          );

          return;
        }

        void loadBookings();
        void loadSchedule();
      },
    );
  }, [
    loadBookings,
    loadSchedule,
    navigate,
  ]);

  /*
   * ==========================
   * RELOAD SCHEDULE
   * WHEN COURT/DATE CHANGES
   * ==========================
   */

  useEffect(() => {
    if (!auth.currentUser) {
      return;
    }

    void loadSchedule();
  }, [
    loadSchedule,
  ]);

  /*
   * ==========================
   * BOOKING FILTERS
   * ==========================
   */

  const visibleBookings =
    useMemo(() => {
      if (
        filter === 'ALL'
      ) {
        return bookings;
      }

      return bookings.filter(
        (booking) =>
          booking.status ===
          filter,
      );
    }, [
      bookings,
      filter,
    ]);

  const counts =
    useMemo(
      () => ({
        pending:
          bookings.filter(
            (booking) =>
              booking.status ===
              'PENDING',
          ).length,

        confirmed:
          bookings.filter(
            (booking) =>
              booking.status ===
              'CONFIRMED',
          ).length,

        completed:
          bookings.filter(
            (booking) =>
              booking.status ===
              'COMPLETED',
          ).length,

        cancelled:
          bookings.filter(
            (booking) =>
              booking.status ===
              'CANCELLED',
          ).length,
      }),
      [bookings],
    );

  /*
   * ==========================
   * BOOKING ACTION
   * ==========================
   */

  async function updateBooking(
    id: string,
    action:
      | 'verify-deposit'
      | 'confirm'
      | 'cancel'
      | 'complete',
  ) {
    try {
      setUpdatingId(id);
      setError('');

      await apiRequest(
        `/admin/bookings/${id}/${action}`,
        {
          method: 'PATCH',
        },
        true,
      );

      await loadBookings();
      await loadSchedule();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update booking.',
      );
    } finally {
      setUpdatingId('');
    }
  }

  /*
   * ==========================
   * COURT SLOT SELECTION
   * ==========================
   */

  function handleScheduleSlotClick(
    clickedIndex: number,
  ) {
    const clicked =
      scheduleSlots[
      clickedIndex
      ];

    if (
      !clicked ||
      clicked.status ===
      'BOOKED'
    ) {
      return;
    }

    setScheduleMessage('');

    /*
     * First selected hour.
     */
    if (
      !selectedScheduleStart
    ) {
      setSelectedScheduleStart(
        clicked.startTime,
      );

      setSelectedScheduleEnd(
        clicked.endTime,
      );

      setError('');

      return;
    }

    const startIndex =
      scheduleSlots.findIndex(
        (slot) =>
          slot.startTime ===
          selectedScheduleStart,
      );

    /*
     * Click same single slot
     * again = clear.
     */
    if (
      clickedIndex ===
      startIndex &&
      selectedScheduleEnd ===
      clicked.endTime
    ) {
      setSelectedScheduleStart(
        '',
      );

      setSelectedScheduleEnd(
        '',
      );

      return;
    }

    /*
     * Clicking earlier slot
     * starts a new range.
     */
    if (
      clickedIndex <
      startIndex
    ) {
      setSelectedScheduleStart(
        clicked.startTime,
      );

      setSelectedScheduleEnd(
        clicked.endTime,
      );

      setError('');

      return;
    }

    const startingStatus =
      scheduleSlots[
        startIndex
      ]?.status;

    if (
      !startingStatus ||
      startingStatus ===
      'BOOKED'
    ) {
      return;
    }

    const range =
      scheduleSlots.slice(
        startIndex,
        clickedIndex + 1,
      );

    /*
     * Don't mix OPEN and BLOCKED
     * slots in one operation.
     */
    const validRange =
      range.every(
        (slot) =>
          slot.status ===
          startingStatus,
      );

    if (!validRange) {
      setError(
        'Select consecutive slots with the same status only.',
      );

      return;
    }

    setSelectedScheduleEnd(
      clicked.endTime,
    );

    setError('');
  }

  const selectedScheduleStatus =
    useMemo(() => {
      if (
        !selectedScheduleStart
      ) {
        return null;
      }

      return (
        scheduleSlots.find(
          (slot) =>
            slot.startTime ===
            selectedScheduleStart,
        )?.status ?? null
      );
    }, [
      scheduleSlots,
      selectedScheduleStart,
    ]);

  const selectedScheduleStartIndex =
    useMemo(
      () =>
        scheduleSlots.findIndex(
          (slot) =>
            slot.startTime ===
            selectedScheduleStart,
        ),
      [
        scheduleSlots,
        selectedScheduleStart,
      ],
    );

  const selectedScheduleEndIndex =
    useMemo(() => {
      if (
        !selectedScheduleEnd
      ) {
        return -1;
      }

      return scheduleSlots.findIndex(
        (slot) =>
          slot.endTime ===
          selectedScheduleEnd,
      );
    }, [
      scheduleSlots,
      selectedScheduleEnd,
    ]);

  /*
   * ==========================
   * CLOSE / REOPEN COURT
   * ==========================
   */

  async function updateCourtSchedule() {
    if (
      !selectedScheduleStart ||
      !selectedScheduleEnd ||
      !selectedScheduleStatus
    ) {
      return;
    }

    try {
      setScheduleUpdating(
        true,
      );

      setError('');
      setScheduleMessage('');

      /*
       * Close open slots.
       */
      if (
        selectedScheduleStatus ===
        'OPEN'
      ) {
        await apiRequest(
          '/admin/bookings/blocks',
          {
            method: 'POST',

            body:
              JSON.stringify({
                courtIds: [
                  scheduleCourtId,
                ],

                date:
                  scheduleDate,

                startTime:
                  selectedScheduleStart,

                endTime:
                  selectedScheduleEnd,

                reason:
                  'Walk-in / admin block',
              }),
          },
          true,
        );

        setScheduleMessage(
          'Selected court time has been closed successfully.',
        );
      }

      /*
       * Reopen manually
       * blocked slots.
       */
      if (
        selectedScheduleStatus ===
        'BLOCKED'
      ) {
        await apiRequest(
          '/admin/bookings/blocks',
          {
            method:
              'DELETE',

            body:
              JSON.stringify({
                courtIds: [
                  scheduleCourtId,
                ],

                date:
                  scheduleDate,

                startTime:
                  selectedScheduleStart,

                endTime:
                  selectedScheduleEnd,
              }),
          },
          true,
        );

        setScheduleMessage(
          'Selected court time has been reopened successfully.',
        );
      }

      await loadSchedule();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update court schedule.',
      );
    } finally {
      setScheduleUpdating(
        false,
      );
    }
  }

  function clearScheduleSelection() {
    setSelectedScheduleStart(
      '',
    );

    setSelectedScheduleEnd(
      '',
    );

    setError('');
  }

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div className="admin-brand">
          <img
            src="/palm-paddle-logo.png"
            alt="Palm & Paddle"
          />

          <div>
            <strong>
              ChocsDwacks Palm & Paddle Sports Center
            </strong>

            <span>
              Admin Dashboard
            </span>
          </div>
        </div>

        <button
          className="secondary-button"
          onClick={async () => {
            await signOut(
              auth,
            );

            navigate(
              '/admin/login',
            );
          }}
        >
          Sign Out
        </button>
      </header>

      <section className="admin-content">

        {/* =====================
            COURT MANAGEMENT
            ===================== */}

        <section className="court-management-card">
          <div className="court-management-header">
            <span className="eyebrow">
              COURT MANAGEMENT
            </span>

            <h2>
              Open / Close Court Time
            </h2>

            <p>
              Block court hours for walk-ins,
              maintenance, private use, or other
              offline reservations.
            </p>
          </div>

          <div className="court-management-controls">
            <label>
              Court

              <select
                value={
                  scheduleCourtId
                }
                onChange={(
                  event,
                ) => {
                  setScheduleCourtId(
                    event.target
                      .value,
                  );

                  setScheduleMessage(
                    '',
                  );
                }}
              >
                <option value="court-1">
                  Court 1
                </option>

                <option value="court-2">
                  Court 2
                </option>
              </select>
            </label>

            <label>
              Date

              <input
                type="date"
                min={todayString()}
                value={
                  scheduleDate
                }
                onChange={(
                  event,
                ) => {
                  setScheduleDate(
                    event.target
                      .value,
                  );

                  setScheduleMessage(
                    '',
                  );
                }}
              />
            </label>
          </div>

          <div className="admin-schedule-legend">
            <span>
              <i className="legend-open" />
              Open
            </span>

            <span>
              <i className="legend-booked" />
              Online Booking
            </span>

            <span>
              <i className="legend-blocked" />
              Walk-in / Closed
            </span>
          </div>

          {scheduleLoading ? (
            <div className="empty-state">
              Loading court schedule...
            </div>
          ) : (
            <div className="admin-schedule-grid">
              {scheduleSlots.map(
                (
                  slot,
                  index,
                ) => {
                  const selected =
                    selectedScheduleStartIndex >=
                    0 &&
                    selectedScheduleEndIndex >=
                    selectedScheduleStartIndex &&
                    index >=
                    selectedScheduleStartIndex &&
                    index <=
                    selectedScheduleEndIndex;

                  return (
                    <button
                      key={
                        slot.startTime
                      }
                      type="button"
                      disabled={
                        slot.status ===
                        'BOOKED'
                      }
                      className={[
                        'admin-schedule-slot',

                        slot.status ===
                          'OPEN'
                          ? 'admin-slot-open'
                          : '',

                        slot.status ===
                          'BOOKED'
                          ? 'admin-slot-booked'
                          : '',

                        slot.status ===
                          'BLOCKED'
                          ? 'admin-slot-blocked'
                          : '',

                        selected
                          ? 'admin-slot-selected'
                          : '',
                      ].join(
                        ' ',
                      )}
                      onClick={() =>
                        handleScheduleSlotClick(
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
                        {slot.status ===
                          'OPEN'
                          ? 'OPEN'
                          : slot.status ===
                            'BOOKED'
                            ? 'BOOKED'
                            : 'CLOSED'}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          )}

          {selectedScheduleStart &&
            selectedScheduleEnd && (
              <div className="admin-selected-time">
                <div>
                  <span>
                    SELECTED TIME
                  </span>

                  <strong>
                    {displayTime(
                      selectedScheduleStart,
                    )}
                    {' – '}
                    {displayTime(
                      selectedScheduleEnd,
                    )}
                  </strong>
                </div>

                <div className="admin-selected-actions">
                  {selectedScheduleStatus ===
                    'OPEN' && (
                      <button
                        type="button"
                        className="close-court-button"
                        disabled={
                          scheduleUpdating
                        }
                        onClick={
                          updateCourtSchedule
                        }
                      >
                        {scheduleUpdating
                          ? 'Closing...'
                          : 'Close Selected Time'}
                      </button>
                    )}

                  {selectedScheduleStatus ===
                    'BLOCKED' && (
                      <button
                        type="button"
                        className="open-court-button"
                        disabled={
                          scheduleUpdating
                        }
                        onClick={
                          updateCourtSchedule
                        }
                      >
                        {scheduleUpdating
                          ? 'Opening...'
                          : 'Reopen Selected Time'}
                      </button>
                    )}

                  <button
                    type="button"
                    className="secondary-button"
                    disabled={
                      scheduleUpdating
                    }
                    onClick={
                      clearScheduleSelection
                    }
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

          {scheduleMessage && (
            <div className="alert success-alert">
              {scheduleMessage}
            </div>
          )}
        </section>

        {/* =====================
            RESERVATIONS
            ===================== */}

        <div className="admin-title">
          <div>
            <span className="eyebrow">
              BOOKING MANAGEMENT
            </span>

            <h1>
              Reservations
            </h1>
          </div>

          <button
            className="secondary-button"
            onClick={() => {
              void loadBookings();
              void loadSchedule();
            }}
          >
            Refresh
          </button>
        </div>

        <div className="stats-grid">
          <div>
            <span>
              Pending
            </span>

            <strong>
              {counts.pending}
            </strong>
          </div>

          <div>
            <span>
              Confirmed
            </span>

            <strong>
              {counts.confirmed}
            </strong>
          </div>

          <div>
            <span>
              Completed
            </span>

            <strong>
              {counts.completed}
            </strong>
          </div>

          <div>
            <span>
              Cancelled
            </span>

            <strong>
              {counts.cancelled}
            </strong>
          </div>
        </div>

        <div className="filter-row">
          {[
            'ALL',
            'PENDING',
            'CONFIRMED',
            'COMPLETED',
            'CANCELLED',
          ].map(
            (status) => (
              <button
                key={status}
                className={
                  filter ===
                    status
                    ? 'active-filter'
                    : ''
                }
                onClick={() =>
                  setFilter(
                    status as
                    | 'ALL'
                    | BookingStatus,
                  )
                }
              >
                {status}
              </button>
            ),
          )}
        </div>

        {error && (
          <div className="alert error-alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            Loading bookings...
          </div>
        ) : visibleBookings.length ===
          0 ? (
          <div className="empty-state">
            No bookings found.
          </div>
        ) : (
          <div className="booking-list">
            {visibleBookings.map(
              (booking) => {
                const courts =
                  booking.courtIds ??
                  (
                    booking.courtId
                      ? [
                        booking.courtId,
                      ]
                      : []
                  );

                return (
                  <article
                    key={
                      booking.id
                    }
                    className="admin-booking-card"
                  >
                    <div className="admin-booking-main">
                      <div className="admin-booking-heading">
                        <div>
                          <small>
                            {
                              booking.reference
                            }
                          </small>

                          <h2>
                            {
                              booking.customerName
                            }
                          </h2>
                        </div>

                        <span
                          className={`status ${booking.status.toLowerCase()}`}
                        >
                          {
                            booking.status
                          }
                        </span>
                      </div>

                      <div className="booking-info">
                        <div>
                          <span>
                            Courts
                          </span>

                          <strong>
                            {courts
                              .map(
                                displayCourt,
                              )
                              .join(
                                ', ',
                              )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Date
                          </span>

                          <strong>
                            {
                              booking.date
                            }
                          </strong>
                        </div>

                        <div>
                          <span>
                            Time
                          </span>

                          <strong>
                            {displayTime(
                              booking.startTime,
                            )}
                            {' – '}
                            {displayTime(
                              booking.endTime,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Total
                          </span>

                          <strong className="admin-price">
                            ₱
                            {(
                              booking.totalPrice ??
                              0
                            ).toLocaleString()}
                          </strong>
                        </div>
                      </div>

                      <div>
                        <span>
                          Security Deposit
                        </span>

                        <strong>
                          ₱
                          {(
                            booking.securityDeposit ??
                            100
                          ).toLocaleString()}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Remaining Balance
                        </span>

                        <strong className="admin-price">
                          ₱
                          {(
                            booking.remainingBalance ??
                            Math.max(
                              (booking.totalPrice ?? 0) -
                              100,
                              0,
                            )
                          ).toLocaleString()}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Deposit Status
                        </span>

                        <strong
                          className={
                            booking.depositStatus ===
                              'VERIFIED'
                              ? 'deposit-verified'
                              : 'deposit-unpaid'
                          }
                        >
                          {booking.depositStatus ??
                            'UNPAID'}
                        </strong>
                      </div>

                      <div className="customer-contact">
                        <span>
                          {
                            booking.email
                          }
                        </span>

                        <span>
                          {
                            booking.phone
                          }
                        </span>
                      </div>

                      {booking.notes && (
                        <p className="admin-notes">
                          {
                            booking.notes
                          }
                        </p>
                      )}
                    </div>

                    <div className="admin-actions">
                      {booking.status ===
                        'PENDING' && (
                          <>
                            {booking.depositStatus !==
                              'VERIFIED' && (
                                <button
                                  className="confirm-button"
                                  disabled={
                                    updatingId ===
                                    booking.id
                                  }
                                  onClick={() =>
                                    updateBooking(
                                      booking.id,
                                      'verify-deposit',
                                    )
                                  }
                                >
                                  {updatingId ===
                                    booking.id
                                    ? 'Verifying...'
                                    : 'Verify ₱100 Deposit'}
                                </button>
                              )}

                            <button
                              className="cancel-button"
                              disabled={
                                updatingId ===
                                booking.id
                              }
                              onClick={() =>
                                updateBooking(
                                  booking.id,
                                  'cancel',
                                )
                              }
                            >
                              Cancel
                            </button>
                          </>
                        )}

                      {booking.status ===
                        'CONFIRMED' && (
                          <>
                            <button
                              className="complete-button"
                              disabled={
                                updatingId ===
                                booking.id
                              }
                              onClick={() =>
                                updateBooking(
                                  booking.id,
                                  'complete',
                                )
                              }
                            >
                              {updatingId ===
                                booking.id
                                ? 'Updating...'
                                : 'Complete'}
                            </button>

                            <button
                              className="cancel-button"
                              disabled={
                                updatingId ===
                                booking.id
                              }
                              onClick={() =>
                                updateBooking(
                                  booking.id,
                                  'cancel',
                                )
                              }
                            >
                              Cancel
                            </button>
                          </>
                        )}
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>
    </main>
  );
}