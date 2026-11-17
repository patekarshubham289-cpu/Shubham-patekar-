import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { EmergencyContact } from '../../types';
import { validatePhone } from '../../lib/validation';
import {
  Activity,
  Heart,
  ShieldAlert,
  Edit,
  Plus,
  Trash2,
  X,
  AlertCircle
} from 'lucide-react';

const BLOOD_GROUPS = ['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const ProfileView: React.FC = () => {
  const {
    user,
    updateProfile,
    addEmergencyContact,
    editEmergencyContact,
    removeEmergencyContact
  } = useApp();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);

  // Profile Edit State
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [bloodGroup, setBloodGroup] = useState(user.bloodGroup);
  const [age, setAge] = useState(user.age);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(user.gender);
  const [height, setHeight] = useState(user.heightCm);
  const [weight, setWeight] = useState(user.weightKg);
  const [allergiesText, setAllergiesText] = useState(user.allergies.join(', '));
  const [conditionsText, setConditionsText] = useState(user.medicalConditions.join(', '));
  const [isDonor, setIsDonor] = useState(user.isDonor);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Emergency Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactPrimary, setContactPrimary] = useState(true);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    if (showEditModal) {
      setName(user.name);
      setPhone(user.phone);
      setBloodGroup(BLOOD_GROUPS.includes(user.bloodGroup) ? user.bloodGroup : 'Unknown');
      setAge(user.age);
      setGender(user.gender);
      setHeight(user.heightCm);
      setWeight(user.weightKg);
      setAllergiesText(user.allergies.join(', '));
      setConditionsText(user.medicalConditions.join(', '));
      setIsDonor(user.isDonor);
      setProfileError(null);
    }
  }, [showEditModal, user]);

  const openAddContactModal = () => {
    setEditingContact(null);
    setContactName('');
    setContactRelation('');
    setContactPhone('');
    setContactPrimary(user.emergencyContacts.length === 0);
    setContactError(null);
    setShowContactModal(true);
  };

  const openEditContactModal = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setContactName(contact.name);
    setContactRelation(contact.relation);
    setContactPhone(contact.phone);
    setContactPrimary(contact.isPrimary);
    setContactError(null);
    setShowContactModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    if (name.trim().length < 2) {
      setProfileError('Full name must be at least 2 characters.');
      return;
    }
    if (!validatePhone(phone, false)) {
      setProfileError('Please enter a valid phone number (e.g. +91 98201 12345) or leave it blank.');
      return;
    }

    const heightM = Number(height) / 100;
    const computedBmi = heightM > 0 ? Number((Number(weight) / (heightM * heightM)).toFixed(1)) : user.bmi;

    setSavingProfile(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        bloodGroup,
        age: Number(age),
        gender,
        heightCm: Number(height),
        weightKg: Number(weight),
        bmi: computedBmi,
        allergies: allergiesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        medicalConditions: conditionsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        isDonor,
      });
      setShowEditModal(false);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);

    if (contactName.trim().length < 2) {
      setContactError('Contact name is required.');
      return;
    }
    if (!validatePhone(contactPhone, true)) {
      setContactError('Please enter a valid emergency phone number.');
      return;
    }

    if (editingContact) {
      await editEmergencyContact(editingContact.id, {
        name: contactName.trim(),
        relation: contactRelation.trim() || 'Family',
        phone: contactPhone.trim(),
        isPrimary: contactPrimary,
      });
    } else {
      await addEmergencyContact({
        name: contactName.trim(),
        relation: contactRelation.trim() || 'Family',
        phone: contactPhone.trim(),
        isPrimary: contactPrimary,
      });
    }
    setShowContactModal(false);
  };

  const initials = (user.name || user.email || 'HC')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Profile Header */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#181818] via-[#1a2e23] to-[#121f18] border border-emerald-500/30 shadow-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-24 h-24 rounded-3xl object-cover ring-4 ring-emerald-500/50 shadow-xl"
            />
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-emerald-500/20 text-emerald-300 font-black text-2xl flex items-center justify-center ring-4 ring-emerald-500/50 shadow-xl">
              {initials}
            </div>
          )}

          <div className="text-center sm:text-left flex-1 space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] border border-emerald-500/30 uppercase">
                VERIFIED {user.role.toUpperCase()}
              </span>
              {user.isDonor && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] border border-amber-500/30 flex items-center gap-1">
                  <Heart className="w-3 h-3 fill-amber-400" /> Registered Organ Donor
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black text-white">{user.name || 'Patient'}</h1>
            <p className="text-xs text-neutral-300">
              {user.email} {user.phone ? `• ${user.phone}` : '• Phone not set'}
            </p>
            <p className="text-xs text-neutral-400">
              {user.gender} • {user.age} Yrs • Height: {user.heightCm}cm • Weight: {user.weightKg}kg
            </p>
          </div>

          <button
            onClick={() => setShowEditModal(true)}
            className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Edit className="w-4 h-4" /> Edit Passport
          </button>
        </div>
      </div>

      {/* Vital Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">Blood Group</span>
          <p className="text-2xl font-black text-red-400">{user.bloodGroup || 'Unknown'}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">Body Mass Index</span>
          <p className="text-2xl font-black text-emerald-400">{user.bmi}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">Height</span>
          <p className="text-2xl font-black text-cyan-400">
            {user.heightCm} <span className="text-xs text-neutral-400">cm</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">Weight</span>
          <p className="text-2xl font-black text-purple-400">
            {user.weightKg} <span className="text-xs text-neutral-400">kg</span>
          </p>
        </div>
      </div>

      {/* Allergies & Conditions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-3xl bg-[#181818] border border-white/10 space-y-3">
          <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" /> Allergies &amp; Drug Hypersensitivity
          </h3>
          {user.allergies.length === 0 ? (
            <p className="text-xs text-neutral-400">No allergies recorded. Click Edit Passport to add.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.allergies.map((a, i) => (
                <span key={i} className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 font-bold text-xs border border-red-500/30">
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 rounded-3xl bg-[#181818] border border-white/10 space-y-3">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4" /> Medical Conditions
          </h3>
          {user.medicalConditions.length === 0 ? (
            <p className="text-xs text-neutral-400">No chronic conditions recorded. Click Edit Passport to add.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.medicalConditions.map((c, i) => (
                <span key={i} className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Emergency Contacts (Firestore collection) */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
              Designated Emergency Contacts ({user.emergencyContacts.length})
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Displayed inside your Medical ID and SOS assistant for instant calling or SMS.
            </p>
          </div>
          <button
            onClick={openAddContactModal}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center gap-1 transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Add Contact
          </button>
        </div>

        {user.emergencyContacts.length === 0 ? (
          <p className="text-xs text-neutral-400 py-3">
            No emergency contacts added yet. Add a primary contact for quick SOS calling/SMS.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {user.emergencyContacts.map((contact) => (
              <div key={contact.id} className="p-4 rounded-2xl bg-neutral-900 border border-white/5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {contact.name}{' '}
                    {contact.isPrimary && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 ml-1">
                        PRIMARY
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    {contact.relation} • {contact.phone}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`tel:${contact.phone}`}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs"
                  >
                    Call
                  </a>
                  <button
                    onClick={() => openEditContactModal(contact)}
                    className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                    title="Edit contact"
                    aria-label={`Edit ${contact.name}`}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeEmergencyContact(contact.id)}
                    className="p-1.5 rounded-xl bg-neutral-800 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 transition"
                    title="Remove contact"
                    aria-label={`Remove ${contact.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#181818] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl relative text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-white">Edit Health Passport</h3>

            {profileError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Account Email (Verified)</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full p-3 rounded-xl bg-neutral-900/50 border border-white/5 text-neutral-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  required
                  className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98201 12345"
                    maxLength={32}
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Age</label>
                  <input
                    type="number"
                    min={0}
                    max={130}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Height (cm)</label>
                  <input
                    type="number"
                    min={30}
                    max={300}
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">
                  Allergies (comma separated)
                </label>
                <input
                  type="text"
                  value={allergiesText}
                  onChange={(e) => setAllergiesText(e.target.value)}
                  placeholder="e.g. Penicillin, Peanuts"
                  className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">
                  Medical Conditions (comma separated)
                </label>
                <input
                  type="text"
                  value={conditionsText}
                  onChange={(e) => setConditionsText(e.target.value)}
                  placeholder="e.g. Mild Asthma, Hypertension"
                  className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDonor}
                  onChange={(e) => setIsDonor(e.target.checked)}
                  className="rounded border-neutral-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-neutral-300 font-semibold">Registered Organ Donor</span>
              </label>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs shadow-lg transition mt-2 disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Save Changes to Firestore'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Emergency Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#181818] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl relative text-white space-y-4">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-white">
              {editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
            </h3>

            {contactError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{contactError}</span>
              </div>
            )}

            <form onSubmit={handleSaveContact} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Contact Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  maxLength={120}
                  required
                  placeholder="Priya Sharma"
                  className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                />
              </div>
              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Relationship</label>
                <input
                  type="text"
                  value={contactRelation}
                  onChange={(e) => setContactRelation(e.target.value)}
                  maxLength={80}
                  required
                  placeholder="Spouse / Parent / Physician"
                  className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                />
              </div>
              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  maxLength={32}
                  required
                  placeholder="+91 98111 65432"
                  className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contactPrimary}
                  onChange={(e) => setContactPrimary(e.target.checked)}
                  className="rounded border-neutral-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-neutral-300 font-semibold">Primary Emergency Contact</span>
              </label>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs shadow-lg transition mt-2"
              >
                {editingContact ? 'Update Emergency Contact' : 'Save Emergency Contact'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
