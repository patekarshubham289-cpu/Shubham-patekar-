import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Doctor, EmergencyStatus } from '../../types';
import {
  Shield,
  CheckCircle2,
  ArrowLeft,
  Plus,
  Lock,
  Trash2,
  Edit,
  X,
  Users,
  CalendarCheck,
  ShieldAlert,
  FileClock,
  FlaskConical,
  BadgeCheck
} from 'lucide-react';

interface AdminStats {
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  totalEmergencyEvents: number;
}

type AdminSection = 'overview' | 'doctors' | 'appointments' | 'sos' | 'users' | 'audit';

export const AdminView: React.FC = () => {
  const {
    isAdmin,
    doctors,
    allAppointments,
    allProfiles,
    emergencyEvents,
    auditLogs,
    setActiveTab,
    seedDoctorDirectory,
    addDoctor,
    editDoctor,
    verifyDoctor,
    removeDoctor,
    updateAppointmentStatus,
    updateEmergencyEventStatus,
    updateUserRole,
    getAuthToken,
    user
  } = useApp();

  const [section, setSection] = useState<AdminSection>('overview');
  const [serverStats, setServerStats] = useState<AdminStats | null>(null);
  const [authUsersStatus, setAuthUsersStatus] = useState<string>('');

  // Doctor CRUD Modal State
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [docName, setDocName] = useState('');
  const [docTitle, setDocTitle] = useState('MD, Specialist');
  const [docSpecialty, setDocSpecialty] = useState('Cardiology');
  const [docHospital, setDocHospital] = useState('');
  const [docAddress, setDocAddress] = useState('');
  const [docFee, setDocFee] = useState(800);
  const [docExp, setDocExp] = useState(10);
  const [docLicense, setDocLicense] = useState('');
  const [docSlotsText, setDocSlotsText] = useState('09:00 AM, 11:00 AM, 02:00 PM, 04:00 PM');
  const [docBio, setDocBio] = useState('');
  const [docStatus, setDocStatus] = useState<'verified' | 'pending' | 'demo'>('verified');

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    const loadOverview = async () => {
      try {
        const token = await getAuthToken();
        if (!token) return;
        const [ovRes, usersRes] = await Promise.all([
          fetch('/api/admin/overview', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (ovRes.ok) {
          const data = await ovRes.json();
          if (!cancelled && data.stats) {
            setServerStats(data.stats);
          }
        }
        if (usersRes.ok) {
          const uData = await usersRes.json();
          if (!cancelled) {
            if (uData.serviceAccountAvailable && Array.isArray(uData.users)) {
              setAuthUsersStatus(
                `Firebase Admin SDK connected (${uData.users.length} Auth records synced)`
              );
            } else {
              setAuthUsersStatus(
                'Managing Firestore /profiles & /admins registry (configure FIREBASE_SERVICE_ACCOUNT_JSON to also push Auth Custom Claims)'
              );
            }
          }
        } else if (!cancelled) {
          setAuthUsersStatus(
            'Managing Firestore /profiles & /admins registry (configure FIREBASE_SERVICE_ACCOUNT_JSON to also push Auth Custom Claims)'
          );
        }
      } catch {
        // Non-blocking
      }
    };

    loadOverview();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, getAuthToken]);

  if (!isAdmin) {
    return (
      <div className="p-8 rounded-3xl bg-[#181818] border border-red-500/30 text-center space-y-4 my-8">
        <Lock className="w-10 h-10 text-red-400 mx-auto" />
        <h2 className="text-xl font-black text-white">Administrator Access Required</h2>
        <p className="text-xs text-neutral-400 max-w-md mx-auto">
          Your account does not have verified administrator privileges.
        </p>
        <button
          onClick={() => setActiveTab('dashboard')}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const openAddDoctor = () => {
    setEditingDoctor(null);
    setDocName('');
    setDocTitle('MD, Consultant');
    setDocSpecialty('Cardiology');
    setDocHospital('');
    setDocAddress('');
    setDocFee(800);
    setDocExp(10);
    setDocLicense('');
    setDocSlotsText('09:00 AM, 11:00 AM, 02:00 PM, 04:00 PM');
    setDocBio('');
    setDocStatus('verified');
    setShowDoctorModal(true);
  };

  const openEditDoctor = (d: Doctor) => {
    setEditingDoctor(d);
    setDocName(d.name);
    setDocTitle(d.title);
    setDocSpecialty(d.specialty);
    setDocHospital(d.hospital);
    setDocAddress(d.address || '');
    setDocFee(d.feeUsd);
    setDocExp(d.experienceYears);
    setDocLicense(d.licenseNumber || '');
    setDocSlotsText(d.availableSlots.join(', '));
    setDocBio(d.bio || '');
    setDocStatus(d.verificationStatus || (d.isDemo ? 'demo' : d.verified ? 'verified' : 'pending'));
    setShowDoctorModal(true);
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    const slots = docSlotsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: docName.trim(),
      title: docTitle.trim(),
      specialty: docSpecialty.trim(),
      hospital: docHospital.trim(),
      address: docAddress.trim(),
      feeUsd: Number(docFee),
      experienceYears: Number(docExp),
      rating: editingDoctor?.rating ?? 4.9,
      reviewCount: editingDoctor?.reviewCount ?? 0,
      photo:
        editingDoctor?.photo ||
        'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400',
      lat: editingDoctor?.lat ?? 19.0760,
      lng: editingDoctor?.lng ?? 72.8777,
      availableSlots: slots.length > 0 ? slots : ['10:00 AM', '02:00 PM'],
      bio: docBio.trim(),
      languages: editingDoctor?.languages ?? ['English'],
      verified: docStatus === 'verified',
      isDemo: docStatus === 'demo',
      verificationStatus: docStatus,
      licenseNumber: docLicense.trim(),
    };

    if (editingDoctor) {
      await editDoctor(editingDoctor.id, payload);
    } else {
      await addDoctor(payload);
    }
    setShowDoctorModal(false);
    setEditingDoctor(null);
  };

  const verifiedDoctorsCount = doctors.filter((d) => d.verified && !d.isDemo).length;
  const demoDoctorsCount = doctors.filter((d) => d.isDemo).length;

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#181818] via-[#241c12] to-[#181818] border border-amber-500/30 flex flex-wrap items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="p-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-white/10"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
              ADMIN CONTROL PLANE
            </span>
            <h1 className="text-2xl font-black text-white">HealthCare+ Operations</h1>
            <p className="text-xs text-neutral-300">
              Clinician verification, appointments, SOS review, user roles &amp; immutable audit trail
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={openAddDoctor}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" /> Add Clinician
          </button>
          <button
            onClick={seedDoctorDirectory}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1.5 transition"
          >
            <FlaskConical className="w-4 h-4" /> Seed Demo Profiles
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {(
          [
            { id: 'overview', label: 'Overview', icon: <Shield className="w-3.5 h-3.5" /> },
            { id: 'doctors', label: `Doctors (${doctors.length})`, icon: <BadgeCheck className="w-3.5 h-3.5" /> },
            { id: 'appointments', label: `Appointments (${allAppointments.length})`, icon: <CalendarCheck className="w-3.5 h-3.5" /> },
            { id: 'sos', label: `SOS Events (${emergencyEvents.length})`, icon: <ShieldAlert className="w-3.5 h-3.5" /> },
            { id: 'users', label: `Users & Roles (${allProfiles.length})`, icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'audit', label: `Audit Logs (${auditLogs.length})`, icon: <FileClock className="w-3.5 h-3.5" /> },
          ] as { id: AdminSection; label: string; icon: React.ReactNode }[]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
              section === tab.id
                ? 'bg-amber-500 text-black shadow-md'
                : 'bg-[#181818] text-neutral-300 hover:text-white border border-white/10'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5 space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">Registered Profiles</span>
          <p className="text-2xl font-black text-white">
            {serverStats ? serverStats.totalPatients : allProfiles.length}
          </p>
          <span className="text-[10px] text-emerald-400 font-semibold">Firestore Live Count</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5 space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">Clinicians</span>
          <p className="text-2xl font-black text-cyan-400">{verifiedDoctorsCount}</p>
          <span className="text-[10px] text-amber-400 font-semibold">
            Verified • {demoDoctorsCount} Demo Samples
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5 space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">Appointments</span>
          <p className="text-2xl font-black text-purple-400">{allAppointments.length}</p>
          <span className="text-[10px] text-purple-400 font-semibold">Platform Wide</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5 space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">SOS Requests</span>
          <p className="text-2xl font-black text-red-400">{emergencyEvents.length}</p>
          <span className="text-[10px] text-emerald-400 font-semibold">Logged Events</span>
        </div>
      </div>

      {/* Doctors Section */}
      {(section === 'overview' || section === 'doctors') && (
        <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400 flex items-center justify-between">
            <span>Doctors &amp; Demo Profiles ({doctors.length})</span>
            <span className="text-amber-400 text-[10px] font-bold">Admin Write Protected</span>
          </h3>

          {doctors.length === 0 ? (
            <p className="text-xs text-neutral-400 py-4 text-center">
              No doctors registered in Firestore yet. Add a verified clinician or seed Demo Sample Profiles above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-neutral-400 uppercase text-[10px]">
                    <th className="pb-3 pr-3">Clinician</th>
                    <th className="pb-3 pr-3">Status</th>
                    <th className="pb-3 pr-3">Specialty</th>
                    <th className="pb-3 pr-3">Clinic</th>
                    <th className="pb-3 pr-3">Fee</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {doctors.map((d) => (
                    <tr key={d.id} className="hover:bg-neutral-900/50 transition">
                      <td className="py-3 pr-3 font-bold text-white flex items-center gap-2">
                        {d.photo && (
                          <img src={d.photo} alt={d.name} className="w-8 h-8 rounded-lg object-cover" />
                        )}
                        <div>
                          <p>{d.name}</p>
                          <p className="text-[10px] text-neutral-500 font-mono">{d.licenseNumber || 'No license #'}</p>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            d.isDemo
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : d.verified
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          {d.isDemo ? 'Demo Sample' : d.verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-cyan-400 font-semibold">{d.specialty}</td>
                      <td className="py-3 pr-3 text-neutral-300">{d.hospital}</td>
                      <td className="py-3 pr-3 font-extrabold text-emerald-400">₹{d.feeUsd}</td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {!d.verified && (
                            <button
                              onClick={() => verifyDoctor(d.id, true)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Verify
                            </button>
                          )}
                          <button
                            onClick={() => openEditDoctor(d)}
                            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-white/10"
                            title="Edit doctor"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeDoctor(d.id)}
                            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 border border-white/10"
                            title="Delete doctor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Appointments Review */}
      {section === 'appointments' && (
        <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
            All Platform Appointments ({allAppointments.length})
          </h3>

          {allAppointments.length === 0 ? (
            <p className="text-xs text-neutral-400 py-4 text-center">No appointments booked yet.</p>
          ) : (
            <div className="space-y-2.5 text-xs">
              {allAppointments.map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-2xl bg-neutral-900 border border-white/5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-bold text-white">
                      {app.doctorName} • <span className="text-cyan-400">{app.date} at {app.timeSlot}</span>
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      Patient UID: {app.userId} • Mode: {app.type} • Status: <strong>{app.status}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {app.status !== 'Completed' && (
                      <button
                        onClick={() => updateAppointmentStatus(app.id, 'Completed')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[11px]"
                      >
                        Mark Completed
                      </button>
                    )}
                    {app.status === 'Upcoming' && (
                      <button
                        onClick={() => updateAppointmentStatus(app.id, 'Cancelled')}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 font-bold text-[11px]"
                      >
                        Cancel &amp; Release Slot
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SOS Events Review */}
      {(section === 'overview' || section === 'sos') && (
        <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
            Emergency SOS Audit Log ({emergencyEvents.length})
          </h3>

          {emergencyEvents.length === 0 ? (
            <p className="text-xs text-neutral-400 py-4 text-center">No emergency SOS events recorded.</p>
          ) : (
            <div className="space-y-2.5 text-xs">
              {emergencyEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 rounded-2xl bg-neutral-900 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-white">{ev.patientName || ev.userId}</p>
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold">
                        {ev.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-300">
                      Location: {ev.userLocation} {ev.gpsAvailable ? '(GPS Verified)' : '(GPS Unavailable)'}
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      SOS ID: {ev.sosId} • Contacts Prepared: {ev.notifiedContactsCount} •{' '}
                      {new Date(ev.createdAt).toLocaleString()}
                    </p>
                    {ev.note && <p className="text-[11px] text-amber-300 italic">Note: {ev.note}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {(
                      [
                        { status: 'ACKNOWLEDGED', label: 'Acknowledge' },
                        { status: 'RESOLVED', label: 'Resolve' },
                        { status: 'CANCELLED', label: 'Cancel' },
                      ] as { status: EmergencyStatus; label: string }[]
                    ).map((btn) => (
                      <button
                        key={btn.status}
                        disabled={ev.status === btn.status}
                        onClick={() =>
                          updateEmergencyEventStatus(
                            ev.id,
                            btn.status,
                            `Updated to ${btn.status} by admin ${user.email}`
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-white/10 text-[11px] font-bold disabled:opacity-40"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users & Roles */}
      {section === 'users' && (
        <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
          <div className="space-y-1">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
              Users &amp; Role Management ({allProfiles.length})
            </h3>
            {authUsersStatus && <p className="text-[11px] text-amber-300">{authUsersStatus}</p>}
          </div>

          {allProfiles.length === 0 ? (
            <p className="text-xs text-neutral-400 py-4 text-center">No user profiles found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-neutral-400 uppercase text-[10px]">
                    <th className="pb-3 pr-3">Name</th>
                    <th className="pb-3 pr-3">Email</th>
                    <th className="pb-3 pr-3">Current Role</th>
                    <th className="pb-3 text-right">Set Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allProfiles.map((prof) => (
                    <tr key={prof.id}>
                      <td className="py-3 pr-3 font-bold text-white">{prof.name}</td>
                      <td className="py-3 pr-3 text-neutral-300">{prof.email}</td>
                      <td className="py-3 pr-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold uppercase">
                          {prof.role}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <select
                          value={prof.role}
                          onChange={(e) =>
                            updateUserRole(prof.id, e.target.value as 'patient' | 'admin' | 'doctor')
                          }
                          className="p-1.5 rounded-lg bg-neutral-900 border border-white/10 text-xs text-white"
                        >
                          <option value="patient">patient</option>
                          <option value="doctor">doctor</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Immutable Audit Logs */}
      {section === 'audit' && (
        <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
            Admin Audit Trail ({auditLogs.length})
          </h3>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-neutral-400 py-4 text-center">
              No administrative actions recorded yet.
            </p>
          ) : (
            <div className="space-y-2 text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 rounded-2xl bg-neutral-900 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-amber-400">{log.action}</span>
                    <span className="text-[10px] text-neutral-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-neutral-200">{log.details}</p>
                  <p className="text-[10px] text-neutral-400">Actor: {log.actorEmail} • Target: {log.targetType}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Doctor Modal */}
      {showDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#181818] border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowDoctorModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-white">
              {editingDoctor ? 'Edit Specialist Profile' : 'Register New Specialist'}
            </h3>

            <form onSubmit={handleSaveDoctor} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    required
                    placeholder="Dr. Rohan Kulkarni"
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Title</label>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Specialty</label>
                  <input
                    type="text"
                    value={docSpecialty}
                    onChange={(e) => setDocSpecialty(e.target.value)}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Verification Tier</label>
                  <select
                    value={docStatus}
                    onChange={(e) => setDocStatus(e.target.value as any)}
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  >
                    <option value="verified">Admin-Verified Clinician</option>
                    <option value="pending">Pending Review</option>
                    <option value="demo">Demo Sample Profile</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Hospital / Clinic</label>
                  <input
                    type="text"
                    value={docHospital}
                    onChange={(e) => setDocHospital(e.target.value)}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">License Number</label>
                  <input
                    type="text"
                    value={docLicense}
                    onChange={(e) => setDocLicense(e.target.value)}
                    placeholder="e.g. NMC / MMC-2024-98231"
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Consult Fee (₹)</label>
                  <input
                    type="number"
                    min={0}
                    max={50000}
                    value={docFee}
                    onChange={(e) => setDocFee(Number(e.target.value))}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    min={0}
                    max={80}
                    value={docExp}
                    onChange={(e) => setDocExp(Number(e.target.value))}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Clinic Address</label>
                <input
                  type="text"
                  value={docAddress}
                  onChange={(e) => setDocAddress(e.target.value)}
                  className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">
                  Available Time Slots (comma separated)
                </label>
                <input
                  type="text"
                  value={docSlotsText}
                  onChange={(e) => setDocSlotsText(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Clinical Bio</label>
                <textarea
                  value={docBio}
                  onChange={(e) => setDocBio(e.target.value)}
                  className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white h-16"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-lg transition mt-2"
              >
                {editingDoctor ? 'Update Clinician Record' : 'Save Clinician to Firestore'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
