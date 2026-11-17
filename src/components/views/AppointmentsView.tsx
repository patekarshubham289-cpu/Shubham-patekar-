import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Doctor, Appointment } from '../../types';
import {
  CalendarCheck,
  Search,
  Star,
  Video,
  MapPin,
  Clock,
  X,
  PhoneOff,
  Plus
} from 'lucide-react';

export const AppointmentsView: React.FC = () => {
  const {
    doctors,
    appointments,
    bookAppointment,
    cancelAppointment,
    seedDoctorDirectory,
    isAdmin,
    showToast
  } = useApp();
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingDate, setBookingDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [bookingTime, setBookingTime] = useState<string>('10:00 AM');
  const [consultType, setConsultType] = useState<'In-Person' | 'Video Consultation'>('Video Consultation');
  const [symptoms, setSymptoms] = useState<string>('');

  const [activeVideoCall, setActiveVideoCall] = useState<Appointment | null>(null);

  const specialties = ['All', 'Cardiology', 'Neurology', 'Dermatology', 'General Medicine'];

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSpecialty = selectedSpecialty === 'All' || doc.specialty === selectedSpecialty;
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSpecialty && matchesSearch;
  });

  const handleOpenBooking = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setBookingTime(doc.availableSlots[0] || '10:00 AM');
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    await bookAppointment(selectedDoctor.id, bookingDate, bookingTime, consultType, symptoms);
    setSymptoms('');
    setSelectedDoctor(null);
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
              BOARD CERTIFIED SPECIALISTS
            </span>
            <h1 className="text-2xl font-black text-white">Doctor Appointments</h1>
            <p className="text-xs text-neutral-300">
              Book verified medical consultants for telehealth video calls or in-person clinic visits
            </p>
          </div>
        </div>
      </div>

      {/* Scheduled Appointments Section */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
          My Appointments ({appointments.length})
        </h3>

        {appointments.length === 0 ? (
          <p className="text-xs text-neutral-400 py-2">No scheduled consultations yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {appointments.map((app) => (
              <div key={app.id} className="p-4 rounded-2xl bg-neutral-900 border border-white/5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {app.doctorPhoto && (
                      <img src={app.doctorPhoto} alt={app.doctorName} className="w-12 h-12 rounded-2xl object-cover" />
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-white">{app.doctorName}</h4>
                      <p className="text-xs text-cyan-400 font-semibold">{app.doctorSpecialty}</p>
                      <p className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-emerald-400" /> {app.date} at {app.timeSlot}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                      app.status === 'Upcoming'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
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
                    {app.type}
                  </span>

                  <div className="flex items-center gap-2">
                    {app.type === 'Video Consultation' && app.status === 'Upcoming' && (
                      <button
                        onClick={() => setActiveVideoCall(app)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition"
                      >
                        <Video className="w-3.5 h-3.5" /> Join Video Call
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
            Available Medical Specialists ({filteredDoctors.length})
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search specialty, doctor name..."
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
              Verified administrators can initialize the clinical specialist directory in the Admin Panel.
            </p>
            {isAdmin && (
              <button
                onClick={seedDoctorDirectory}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold transition"
              >
                <Plus className="w-4 h-4" /> Initialize Verified Doctor Directory
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDoctors.map((doc) => (
              <div
                key={doc.id}
                className="p-5 rounded-3xl bg-neutral-900 border border-white/5 space-y-4 shadow-lg hover:border-cyan-500/30 transition"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={doc.photo}
                    alt={doc.name}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-cyan-500/30"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-white">{doc.name}</h4>
                      <span className="flex items-center gap-1 text-xs font-extrabold text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400" /> {doc.rating} ({doc.reviewCount})
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-cyan-400">{doc.title}</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {doc.experienceYears} Years Exp • {doc.hospital}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">{doc.bio}</p>

                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">Consultation Fee</span>
                    <span className="font-extrabold text-emerald-400">${doc.feeUsd}</span>
                  </div>

                  <button
                    onClick={() => handleOpenBooking(doc)}
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
          <div className="w-full max-w-lg bg-[#181818] border border-cyan-500/30 rounded-3xl p-6 shadow-2xl relative text-white space-y-4">
            <button
              onClick={() => setSelectedDoctor(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <img src={selectedDoctor.photo} alt={selectedDoctor.name} className="w-12 h-12 rounded-xl object-cover" />
              <div>
                <h3 className="text-base font-black text-white">{selectedDoctor.name}</h3>
                <p className="text-xs text-cyan-400">
                  {selectedDoctor.specialty} • Fee: ${selectedDoctor.feeUsd}
                </p>
              </div>
            </div>

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
                    <Video className="w-4 h-4" /> Video Call
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Preferred Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Time Slot</label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  >
                    {selectedDoctor.availableSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
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
                className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-extrabold text-xs shadow-lg transition"
              >
                Confirm Appointment (${selectedDoctor.feeUsd})
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Video Consultation Room Modal */}
      {activeVideoCall && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="p-4 bg-neutral-900 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
              <p className="text-sm font-bold text-white">
                Telehealth Video Room • {activeVideoCall.doctorName}
              </p>
            </div>
            <button
              onClick={() => setActiveVideoCall(null)}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
            >
              <PhoneOff className="w-4 h-4" /> End Call
            </button>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 p-4 gap-4 bg-[#0D0D0D]">
            <div className="md:col-span-2 relative bg-neutral-900 rounded-3xl overflow-hidden border border-white/10 flex items-center justify-center">
              {activeVideoCall.doctorPhoto && (
                <img src={activeVideoCall.doctorPhoto} alt={activeVideoCall.doctorName} className="w-full h-full object-cover" />
              )}
              <div className="absolute top-4 left-4 p-2 bg-black/60 rounded-xl text-xs text-white backdrop-blur-md">
                {activeVideoCall.doctorName} • Encrypted Telehealth Room
              </div>
            </div>

            <div className="bg-[#181818] rounded-3xl p-4 border border-white/10 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                  Consultation Details
                </h4>
                <div className="p-3 bg-neutral-900 rounded-xl text-xs text-neutral-300 space-y-1.5">
                  <p>Date: {activeVideoCall.date}</p>
                  <p>Time: {activeVideoCall.timeSlot}</p>
                  <p>Symptoms: {activeVideoCall.symptoms || 'General consultation'}</p>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <button
                  onClick={() =>
                    showToast('Follow-up e-prescription request sent to specialist', 'success')
                  }
                  className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs"
                >
                  Request E-Prescription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
