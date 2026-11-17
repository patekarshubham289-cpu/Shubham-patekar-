import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Doctor, Appointment } from '../../types';
import { getTodayDateString } from '../../lib/validation';
import {
  CalendarCheck,
  Search,
  Star,
  Video,
  MapPin,
  Clock,
  X,
  PhoneOff,
  Plus,
  BadgeCheck,
  FlaskConical,
  AlertCircle
} from 'lucide-react';

export const AppointmentsView: React.FC = () => {
  const {
    doctors,
    slotLocks,
    appointments,
    bookAppointment,
    cancelAppointment,
    seedDoctorDirectory,
    isAdmin,
    showToast
  } = useApp();

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [apptTab, setApptTab] = useState<'upcoming' | 'history'>('upcoming');

  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingDate, setBookingDate] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(
      tomorrow.getDate()
    ).padStart(2, '0')}`;
  });
  const [bookingTime, setBookingTime] = useState<string>('10:00 AM');
  const [consultType, setConsultType] = useState<'In-Person' | 'Video Consultation'>('Video Consultation');
  const [symptoms, setSymptoms] = useState<string>('');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [activeTelehealthRoom, setActiveTelehealthRoom] = useState<Appointment | null>(null);

  const specialties = ['All', 'Cardiology', 'Neurology', 'Dermatology', 'General Medicine'];

  const upcomingAppointments = appointments.filter((a) => a.status === 'Upcoming');
  const historyAppointments = appointments.filter((a) => a.status !== 'Upcoming');
  const displayedAppointments = apptTab === 'upcoming' ? upcomingAppointments : historyAppointments;

  const filteredDoctors = doctors.filter((docItem) => {
    const matchesSpecialty = selectedSpecialty === 'All' || docItem.specialty === selectedSpecialty;
    const matchesSearch =
      docItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      docItem.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      docItem.hospital.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSpecialty && matchesSearch;
  });

  // Track which time slots are already reserved for selectedDoctor + bookingDate or conflict with patient's upcoming appointments
  const unavailableSlotReasons = useMemo(() => {
    const reasons: Record<string, string> = {};
    if (!selectedDoctor) return reasons;

    slotLocks.forEach((lock) => {
      if (lock.active && lock.doctorId === selectedDoctor.id && lock.date === bookingDate) {
        reasons[lock.timeSlot] = 'Reserved by another booking';
      }
    });

    upcomingAppointments.forEach((appt) => {
      if (appt.date === bookingDate) {
        reasons[appt.timeSlot] =
          appt.doctorId === selectedDoctor.id
            ? 'Already booked by you'
            : `Conflicts with your ${appt.doctorName} visit`;
      }
    });

    return reasons;
  }, [selectedDoctor, bookingDate, slotLocks, upcomingAppointments]);

  const handleOpenBooking = (docItem: Doctor) => {
    setSelectedDoctor(docItem);
    setBookingError(null);
    const unavailableOnCurrentDate = new Set<string>();
    slotLocks.forEach((lock) => {
      if (lock.active && lock.doctorId === docItem.id && lock.date === bookingDate) {
        unavailableOnCurrentDate.add(lock.timeSlot);
      }
    });
    upcomingAppointments.forEach((appt) => {
      if (appt.date === bookingDate) {
        unavailableOnCurrentDate.add(appt.timeSlot);
      }
    });
    const firstAvailable =
      docItem.availableSlots.find((s) => !unavailableOnCurrentDate.has(s)) ||
      docItem.availableSlots[0] ||
      '10:00 AM';
    setBookingTime(firstAvailable);
  };

  const handleDateChange = (nextDate: string) => {
    setBookingDate(nextDate);
    setBookingError(null);
    if (!selectedDoctor) return;

    const busy = new Set<string>();
    slotLocks.forEach((lock) => {
      if (lock.active && lock.doctorId === selectedDoctor.id && lock.date === nextDate) {
        busy.add(lock.timeSlot);
      }
    });
    upcomingAppointments.forEach((appt) => {
      if (appt.date === nextDate) {
        busy.add(appt.timeSlot);
      }
    });
    if (busy.has(bookingTime)) {
      const nextAvailable = selectedDoctor.availableSlots.find((s) => !busy.has(s));
      if (nextAvailable) setBookingTime(nextAvailable);
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    setBookingError(null);

    const conflict = unavailableSlotReasons[bookingTime];
    if (conflict) {
      setBookingError(`Cannot book ${bookingTime} on ${bookingDate}: ${conflict}.`);
      return;
    }

    setSubmitting(true);
    try {
      await bookAppointment(selectedDoctor.id, bookingDate, bookingTime, consultType, symptoms);
      setSymptoms('');
      setSelectedDoctor(null);
    } catch (err: any) {
      setBookingError(err?.message || 'Booking conflict detected. Please pick another slot.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderVerificationBadge = (docItem: Doctor) => {
    const status =
      docItem.verificationStatus ||
      (docItem.isDemo ? 'demo' : docItem.verified ? 'verified' : 'pending');

    if (status === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
          <BadgeCheck className="w-3 h-3" /> Admin-Verified Clinician
        </span>
      );
    }
    if (status === 'demo') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
          <FlaskConical className="w-3 h-3" /> Demo Sample Profile
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 border border-white/10 text-[10px] font-bold">
        Pending Credential Review
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#181818] via-[#122026] to-[#181818] border border-cyan-500/30 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <CalendarCheck className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/30">
              CLINICAL SCHEDULING &amp; SLOT LOCKING
            </span>
            <h1 className="text-2xl font-black text-white">Doctor Appointments</h1>
            <p className="text-xs text-neutral-300">
              Conflict-checked bookings distinguishing Admin-Verified Clinicians from Demo Sample Profiles
            </p>
          </div>
        </div>
      </div>

      {/* Scheduled Appointments & History Section */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
            My Consultations
          </h3>
          <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setApptTab('upcoming')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                apptTab === 'upcoming' ? 'bg-cyan-500 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Upcoming ({upcomingAppointments.length})
            </button>
            <button
              onClick={() => setApptTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                apptTab === 'history' ? 'bg-cyan-500 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              History ({historyAppointments.length})
            </button>
          </div>
        </div>

        {displayedAppointments.length === 0 ? (
          <p className="text-xs text-neutral-400 py-3">
            {apptTab === 'upcoming'
              ? 'No upcoming consultations scheduled. Select a specialist below to book.'
              : 'No completed or cancelled appointments in your history yet.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayedAppointments.map((app) => (
              <div key={app.id} className="p-4 rounded-2xl bg-neutral-900 border border-white/5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {app.doctorPhoto && (
                      <img src={app.doctorPhoto} alt={app.doctorName} className="w-12 h-12 rounded-2xl object-cover shrink-0" />
                    )}
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{app.doctorName}</h4>
                      <p className="text-xs text-cyan-400 font-semibold">{app.doctorSpecialty}</p>
                      <p className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-emerald-400" /> {app.date} at {app.timeSlot}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border shrink-0 ${
                      app.status === 'Upcoming'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : app.status === 'Completed'
                        ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                        : 'bg-neutral-800 text-neutral-400 border-white/10'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>

                {app.symptoms && (
                  <p className="text-[11px] text-neutral-300 bg-neutral-950 p-2.5 rounded-xl border border-white/5 italic">
                    &quot;{app.symptoms}&quot;
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    {app.type} {app.meetingLink ? `• ${app.meetingLink}` : ''}
                  </span>

                  <div className="flex items-center gap-2">
                    {app.type === 'Video Consultation' && app.status === 'Upcoming' && (
                      <button
                        onClick={() => setActiveTelehealthRoom(app)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition"
                      >
                        <Video className="w-3.5 h-3.5" /> Session Details
                      </button>
                    )}
                    {app.status === 'Upcoming' && (
                      <button
                        onClick={() => cancelAppointment(app.id)}
                        className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Doctor Directory Search & Filters */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
            Specialist Directory ({filteredDoctors.length})
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search specialty, doctor, clinic..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {specialties.map((spec) => (
            <button
              key={spec}
              onClick={() => setSelectedSpecialty(spec)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedSpecialty === spec
                  ? 'bg-cyan-500 text-white shadow-md'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white border border-white/5'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>

        {doctors.length === 0 ? (
          <div className="p-8 rounded-2xl bg-neutral-900 border border-white/5 text-center space-y-3">
            <p className="text-sm font-bold text-white">No specialists registered in Firestore yet.</p>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              Verified administrators can register real clinicians or seed labeled Demo Sample Profiles inside the Admin Control Plane.
            </p>
            {isAdmin && (
              <button
                onClick={seedDoctorDirectory}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold transition"
              >
                <Plus className="w-4 h-4" /> Seed Demo Sample Profiles
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDoctors.map((docItem) => (
              <div
                key={docItem.id}
                className="p-5 rounded-3xl bg-neutral-900 border border-white/5 space-y-3.5 shadow-lg hover:border-cyan-500/30 transition"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {renderVerificationBadge(docItem)}
                  {docItem.licenseNumber && (
                    <span className="text-[10px] font-mono text-neutral-400">
                      Lic: {docItem.licenseNumber}
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-4">
                  {docItem.photo && (
                    <img
                      src={docItem.photo}
                      alt={docItem.name}
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-cyan-500/30 shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-base font-bold text-white truncate">{docItem.name}</h4>
                      <span className="flex items-center gap-1 text-xs font-extrabold text-amber-400 shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-400" /> {docItem.rating} ({docItem.reviewCount})
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-cyan-400">{docItem.title}</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {docItem.experienceYears} Years Exp • {docItem.hospital}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">{docItem.bio}</p>

                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">Consultation Fee</span>
                    <span className="font-extrabold text-emerald-400">₹{docItem.feeUsd}</span>
                  </div>

                  <button
                    onClick={() => handleOpenBooking(docItem)}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-extrabold text-xs shadow-md transition"
                  >
                    Book Appointment
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Form Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#181818] border border-cyan-500/30 rounded-3xl p-6 shadow-2xl relative text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedDoctor(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
              aria-label="Close booking modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              {selectedDoctor.photo && (
                <img src={selectedDoctor.photo} alt={selectedDoctor.name} className="w-12 h-12 rounded-xl object-cover" />
              )}
              <div className="space-y-1">
                <h3 className="text-base font-black text-white">{selectedDoctor.name}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-cyan-400">
                    {selectedDoctor.specialty} • Fee: ₹{selectedDoctor.feeUsd}
                  </span>
                  {renderVerificationBadge(selectedDoctor)}
                </div>
              </div>
            </div>

            {selectedDoctor.isDemo && (
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2">
                <FlaskConical className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  This is a labeled <strong>Demo Sample Profile</strong> for workflow and conflict testing—not a live licensed practitioner.
                </span>
              </div>
            )}

            {bookingError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmBooking} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Consultation Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConsultType('Video Consultation')}
                    className={`py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                      consultType === 'Video Consultation' ? 'bg-cyan-500 text-white' : 'bg-neutral-900 text-neutral-400'
                    }`}
                  >
                    <Video className="w-4 h-4" /> Telehealth
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsultType('In-Person')}
                    className={`py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                      consultType === 'In-Person' ? 'bg-cyan-500 text-white' : 'bg-neutral-900 text-neutral-400'
                    }`}
                  >
                    <MapPin className="w-4 h-4" /> Clinic Visit
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Preferred Date</label>
                <input
                  type="date"
                  min={getTodayDateString()}
                  value={bookingDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">
                  Available Time Slots for {bookingDate}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedDoctor.availableSlots.map((slot) => {
                    const conflict = unavailableSlotReasons[slot];
                    const isSelected = bookingTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={Boolean(conflict)}
                        onClick={() => {
                          setBookingTime(slot);
                          setBookingError(null);
                        }}
                        className={`p-2.5 rounded-xl text-left border transition ${
                          conflict
                            ? 'bg-neutral-950 border-red-500/20 text-neutral-500 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'bg-cyan-500 text-white border-cyan-400 font-bold'
                            : 'bg-neutral-900 border-white/10 text-neutral-200 hover:border-cyan-500/40'
                        }`}
                      >
                        <p className="font-bold">{slot}</p>
                        {conflict && <p className="text-[9px] text-red-400 mt-0.5">{conflict}</p>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Reason for Visit / Symptoms</label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  maxLength={1000}
                  placeholder="Describe your health symptoms or routine review request..."
                  className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white h-20"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || Boolean(unavailableSlotReasons[bookingTime])}
                className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-extrabold text-xs shadow-lg transition disabled:opacity-50"
              >
                {submitting ? 'Reserving Slot...' : `Confirm Booking (₹${selectedDoctor.feeUsd})`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Telehealth Consultation Room Info Modal */}
      {activeTelehealthRoom && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#181818] rounded-3xl p-6 border border-cyan-500/30 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  {activeTelehealthRoom.meetingLink || 'Telehealth Consultation'}
                </span>
                <h3 className="text-lg font-black text-white">{activeTelehealthRoom.doctorName}</h3>
              </div>
              <button
                onClick={() => setActiveTelehealthRoom(null)}
                className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <PhoneOff className="w-3.5 h-3.5" /> Close
              </button>
            </div>

            <div className="p-4 bg-neutral-900 rounded-2xl text-xs text-neutral-300 space-y-2 border border-white/5">
              <p><strong>Specialty:</strong> {activeTelehealthRoom.doctorSpecialty}</p>
              <p><strong>Scheduled Date &amp; Time:</strong> {activeTelehealthRoom.date} at {activeTelehealthRoom.timeSlot}</p>
              <p><strong>Patient Notes:</strong> {activeTelehealthRoom.symptoms || 'General consultation'}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200">
              In-browser live video/audio streaming requires connecting your clinic&apos;s WebRTC/telehealth media provider. Your confirmed appointment slot &amp; reference remain active in Firestore.
            </div>

            <button
              onClick={() => {
                showToast('Consultation check-in note logged', 'success');
                setActiveTelehealthRoom(null);
              }}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs"
            >
              Acknowledge Session Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
