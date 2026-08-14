import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext.jsx';

import {
  subscribeToContactMessages,
  updateContactMessageStatus
} from '../../services/justifiFirebase.js';


function formatInquiryDate(value) {
  if (!value) return 'Date unavailable';

  try {
    const date =
      typeof value.toDate === 'function'
        ? value.toDate()
        : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Date unavailable';
    }

    return date.toLocaleString();
  } catch {
    return 'Date unavailable';
  }
}


export default function DeveloperInquiries() {
  const navigate = useNavigate();

  const {
    user,
    loading
  } = useAuth();


  const [
    inquiries,
    setInquiries
  ] = useState([]);


  const [
    loadingInquiries,
    setLoadingInquiries
  ] = useState(true);


  const [
    error,
    setError
  ] = useState('');


  const [
    search,
    setSearch
  ] = useState('');


  const [
    statusFilter,
    setStatusFilter
  ] = useState('');


  const [
    selectedInquiry,
    setSelectedInquiry
  ] = useState(null);


  const [
    updating,
    setUpdating
  ] = useState(false);



  /* =========================================
     ROLE PROTECTION
  ========================================= */

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate(
        '/login',
        {
          replace: true
        }
      );

      return;
    }

    if (
      (user.role || '') !==
      'developer'
    ) {
      navigate(
        '/dashboard/student',
        {
          replace: true
        }
      );
    }
  }, [
    loading,
    user,
    navigate
  ]);



  /* =========================================
     LOAD INQUIRIES
  ========================================= */

  useEffect(() => {
    if (
      !user ||
      user.role !== 'developer'
    ) {
      return undefined;
    }


    setLoadingInquiries(true);


    const unsubscribe =
      subscribeToContactMessages(

        (messages) => {
          setInquiries(
            Array.isArray(messages)
              ? messages
              : []
          );

          setError('');

          setLoadingInquiries(false);
        },


        (err) => {
          console.error(err);

          setError(
            err?.code ===
            'permission-denied'
              ? 'Firestore blocked access to inquiries. Check developer permissions for contactMessages.'
              : 'Unable to load inquiries.'
          );

          setInquiries([]);

          setLoadingInquiries(false);
        }

      );


    return () => {
      try {
        unsubscribe?.();
      } catch {
        // Ignore cleanup errors.
      }
    };

  }, [user]);



  /* =========================================
     STATISTICS
  ========================================= */

  const stats = useMemo(() => {
    return {

      total:
        inquiries.length,


      unread:
        inquiries.filter(
          (item) =>
            (item.status || 'unread') ===
            'unread'
        ).length,


      resolved:
        inquiries.filter(
          (item) =>
            item.status ===
            'resolved'
        ).length

    };

  }, [inquiries]);



  /* =========================================
     SEARCH + FILTER
  ========================================= */

  const filteredInquiries =
    useMemo(() => {

      const term =
        String(search || '')
          .toLowerCase()
          .trim();


      const status =
        String(statusFilter || '')
          .toLowerCase()
          .trim();


      return inquiries.filter(
        (inquiry) => {

          const inquiryStatus =
            String(
              inquiry.status ||
              'unread'
            ).toLowerCase();


          if (
            status &&
            inquiryStatus !== status
          ) {
            return false;
          }


          if (!term) {
            return true;
          }


          const haystack = [
            inquiry.name,
            inquiry.email,
            inquiry.subject,
            inquiry.message
          ]
            .join(' ')
            .toLowerCase();


          return haystack.includes(
            term
          );
        }
      );

    }, [
      inquiries,
      search,
      statusFilter
    ]);



  /* =========================================
     OPEN INQUIRY
  ========================================= */

  async function openInquiry(
    inquiry
  ) {
    setSelectedInquiry(
      inquiry
    );


    if (
      (inquiry.status || 'unread') ===
      'unread'
    ) {

      try {

        await updateContactMessageStatus(
          inquiry.id,
          'read'
        );


        setSelectedInquiry(
          (current) =>
            current
              ? {
                  ...current,
                  status: 'read'
                }
              : current
        );

      } catch (error) {

        console.error(
          'Failed to mark inquiry as read:',
          error
        );

      }
    }
  }



  /* =========================================
     RESOLVE INQUIRY
  ========================================= */

  async function markResolved() {

    if (
      !selectedInquiry?.id
    ) {
      return;
    }


    setUpdating(true);


    try {

      await updateContactMessageStatus(
        selectedInquiry.id,
        'resolved'
      );


      setSelectedInquiry(
        (current) =>
          current
            ? {
                ...current,
                status: 'resolved'
              }
            : current
      );

    } catch (error) {

      console.error(
        'Failed to resolve inquiry:',
        error
      );

    } finally {

      setUpdating(false);

    }
  }



  /* =========================================
     REPLY BY EMAIL
  ========================================= */

  function replyByEmail() {

    if (
      !selectedInquiry?.email
    ) {
      return;
    }


    const subject =
      selectedInquiry.subject
        ? `Re: ${selectedInquiry.subject}`
        : 'Re: JustiFi Inquiry';


    window.location.href =
      `mailto:${encodeURIComponent(
        selectedInquiry.email
      )}?subject=${encodeURIComponent(
        subject
      )}`;
  }



  if (loading) {
    return null;
  }



  return (
    <div
      className="
        developer-page
        developer-inquiries-page
      "
    >

      {/* ============================
          HEADER
      ============================ */}

      <header className="topbar">

        <button
          className="brand"
          type="button"
          onClick={() =>
            navigate(
              '/dashboard/developer'
            )
          }
        >
          JustiFi
        </button>


        <div className="topbar-right">

          <span className="welcome">
            Manage Inquiries
          </span>

        </div>

      </header>



      {/* ============================
          BACK BUTTON
      ============================ */}

      <div className="back-row">

        <button
          className="back-btn"
          type="button"
          onClick={() =>
            navigate(
              '/dashboard/developer'
            )
          }
        >
          Back
        </button>

      </div>



      <main className="page-shell">


        {/* ============================
            HERO
        ============================ */}

        <section className="hero-card">

          <p className="eyebrow">
            DEVELOPER TOOL
          </p>


          <h1>
            Manage Inquiries
          </h1>


          <p className="hero-subtext">
            Review messages submitted
            through the JustiFi website
            contact form.
          </p>

        </section>



        {/* ============================
            STATUS CARDS
        ============================ */}

        <section
          className="inquiry-stats"
        >

          <article
            className="
              inquiry-stat-card
              inquiry-stat-total
            "
          >

            <span
              className="
                inquiry-stat-label
              "
            >
              Total Inquiries
            </span>


            <strong
              className="
                inquiry-stat-value
              "
            >
              {stats.total}
            </strong>

          </article>



          <article
            className="
              inquiry-stat-card
              inquiry-stat-unread
            "
          >

            <span
              className="
                inquiry-stat-label
              "
            >
              Unread
            </span>


            <strong
              className="
                inquiry-stat-value
              "
            >
              {stats.unread}
            </strong>

          </article>



          <article
            className="
              inquiry-stat-card
              inquiry-stat-resolved
            "
          >

            <span
              className="
                inquiry-stat-label
              "
            >
              Resolved
            </span>


            <strong
              className="
                inquiry-stat-value
              "
            >
              {stats.resolved}
            </strong>

          </article>

        </section>



        {/* ============================
            INBOX
        ============================ */}

        <section
          className="
            panel-card
            inquiry-panel
          "
        >


          <div
            className="
              inquiry-panel-head
            "
          >

            <div>

              <p className="card-kicker">
                CONTACT MESSAGES
              </p>


              <h2>
                Inquiry Inbox
              </h2>

            </div>


            <span
              className="
                inquiry-count
              "
            >

              {filteredInquiries.length}{' '}

              {filteredInquiries.length === 1
                ? 'inquiry'
                : 'inquiries'}

            </span>

          </div>



          {/* ============================
              SEARCH + FILTER
          ============================ */}

          <div
            className="
              inquiry-toolbar
            "
          >

            <input
              className="
                inquiry-search
              "
              type="search"
              placeholder="
                Search name, email,
                subject, or message...
              "
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />


            <select
              className="
                inquiry-filter
              "
              value={
                statusFilter
              }
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >

              <option value="">
                All statuses
              </option>


              <option value="unread">
                Unread
              </option>


              <option value="read">
                Read
              </option>


              <option value="resolved">
                Resolved
              </option>

            </select>

          </div>



          {/* ============================
              LOADING
          ============================ */}

          {loadingInquiries && (

            <div
              className="
                inquiry-empty-state
              "
            >
              Loading inquiries...
            </div>

          )}



          {/* ============================
              ERROR
          ============================ */}

          {!loadingInquiries &&
            error && (

              <div
                className="
                  inquiry-empty-state
                  is-error
                "
              >
                {error}
              </div>

            )}



          {/* ============================
              EMPTY
          ============================ */}

          {!loadingInquiries &&
            !error &&
            !filteredInquiries.length && (

              <div
                className="
                  inquiry-empty-state
                "
              >

                <strong>
                  No inquiries found
                </strong>

                <p>
                  Try changing the
                  search or status
                  filter.
                </p>

              </div>

            )}



          {/* ============================
              INQUIRY LIST
          ============================ */}

          {!loadingInquiries &&
            !error &&
            filteredInquiries.length > 0 && (

              <div
                className="
                  inquiry-list
                "
              >

                {filteredInquiries.map(
                  (inquiry) => {

                    const status =
                      inquiry.status ||
                      'unread';


                    return (

                      <button
                        key={inquiry.id}

                        type="button"

                        className={[
                          'inquiry-item',

                          status ===
                          'unread'
                            ? 'is-unread'
                            : ''

                        ].join(' ')}

                        onClick={() =>
                          openInquiry(
                            inquiry
                          )
                        }
                      >


                        {/* Sender */}

                        <div
                          className="
                            inquiry-main
                          "
                        >

                          <strong>
                            {inquiry.name ||
                              'Unknown sender'}
                          </strong>


                          <span>
                            {inquiry.email ||
                              'No email'}
                          </span>

                        </div>



                        {/* Subject + Message */}

                        <div
                          className="
                            inquiry-subject
                          "
                        >

                          <strong>
                            {inquiry.subject ||
                              'No subject'}
                          </strong>


                          <p>
                            {inquiry.message ||
                              'No message'}
                          </p>

                        </div>



                        {/* Status + Date */}

                        <div
                          className="
                            inquiry-meta
                          "
                        >

                          <span
                            className={[
                              'inquiry-status',
                              `status-${status}`
                            ].join(' ')}
                          >
                            {status}
                          </span>


                          <small>
                            {formatInquiryDate(
                              inquiry.createdAt
                            )}
                          </small>

                        </div>

                      </button>

                    );

                  }
                )}

              </div>

            )}

        </section>

      </main>



      {/* ============================
          DETAILS MODAL
      ============================ */}

      {selectedInquiry && (

        <div
          className="
            inquiry-modal
          "
        >

          <button
            type="button"

            className="
              inquiry-modal-backdrop
            "

            aria-label="
              Close inquiry
            "

            onClick={() =>
              setSelectedInquiry(
                null
              )
            }
          />



          <section
            className="
              inquiry-modal-card
            "

            role="dialog"

            aria-modal="true"

            aria-labelledby="
              inquiry-modal-title
            "
          >


            {/* Modal Header */}

            <div
              className="
                inquiry-modal-header
              "
            >

              <div>

                <p className="card-kicker">
                  INQUIRY DETAILS
                </p>


                <h2
                  id="
                    inquiry-modal-title
                  "
                >
                  {selectedInquiry.subject ||
                    'Website Inquiry'}
                </h2>

              </div>



              <button
                type="button"

                className="
                  inquiry-close
                "

                aria-label="
                  Close inquiry
                "

                onClick={() =>
                  setSelectedInquiry(
                    null
                  )
                }
              >
                ✕
              </button>

            </div>



            {/* Modal Body */}

            <div
              className="
                inquiry-detail-body
              "
            >


              <div
                className="
                  inquiry-detail-row
                "
              >

                <span>
                  Name
                </span>


                <strong>
                  {selectedInquiry.name ||
                    'Not provided'}
                </strong>

              </div>



              <div
                className="
                  inquiry-detail-row
                "
              >

                <span>
                  Email
                </span>


                <strong>
                  {selectedInquiry.email ||
                    'Not provided'}
                </strong>

              </div>



              <div
                className="
                  inquiry-detail-row
                "
              >

                <span>
                  Status
                </span>


                <strong>
                  {selectedInquiry.status ||
                    'unread'}
                </strong>

              </div>



              <div
                className="
                  inquiry-detail-row
                "
              >

                <span>
                  Received
                </span>


                <strong>
                  {formatInquiryDate(
                    selectedInquiry.createdAt
                  )}
                </strong>

              </div>



              <div
                className="
                  inquiry-message-box
                "
              >

                <span>
                  Message
                </span>


                <p>
                  {selectedInquiry.message ||
                    'No message provided.'}
                </p>

              </div>



              {/* Actions */}

              <div
                className="
                  inquiry-actions
                "
              >

                <button
                  type="button"

                  className="
                    inquiry-btn
                    inquiry-btn-secondary
                  "

                  onClick={
                    replyByEmail
                  }
                >
                  Reply by Email
                </button>



                <button
                  type="button"

                  className="
                    inquiry-btn
                    inquiry-btn-primary
                  "

                  disabled={
                    updating ||
                    selectedInquiry.status ===
                      'resolved'
                  }

                  onClick={
                    markResolved
                  }
                >

                  {selectedInquiry.status ===
                  'resolved'
                    ? 'Resolved'
                    : updating
                      ? 'Updating...'
                      : 'Mark as Resolved'}

                </button>

              </div>

            </div>

          </section>

        </div>

      )}

    </div>
  );
}