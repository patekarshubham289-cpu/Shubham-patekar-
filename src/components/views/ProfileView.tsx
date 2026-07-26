import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Activity, Heart, ShieldAlert, Edit, Phone, Mail, Award, X } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, updateProfile } = useApp();
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit Form State
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [bloodGroup, setBloodGroup] = useState(user.bloodGroup);
  const [age, setAge] = useState(user.age);
  const [height, setHeight] = useState(user.heightCm);
  const [weight, setWeight] = useState(user.weightKg);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name,
      phone,
      bloodGroup,
      age: Number(age),
      heightCm: Number(height),
      weightKg: Number(weight)
    });
    setShowEditModal(false);
  };

  return (
    <div className="space-y-6 pb-24 text-white">
      
      {/* Profile Header */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#181818] via-[#1a2e23] to-[#121f18] border border-emerald-500/30 shadow-2xl overflow-hidden">
        
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-24 h-24 rounded-3xl object-cover ring-4 ring-emerald-500/50 shadow-xl"
          />
          
          <div className="text-center sm:text-left flex-1 space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] border border-emerald-500/30 uppercase">
                VERIFIED PATIENT
              </span>
              {user.isDonor && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] border border-amber-500/30 flex items-center gap-1">
                  <Heart className="w-3 h-3 fill-amber-400" /> Registered Organ Donor
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black text-white">{user.name}</h1>
            <p className="text-xs text-neutral-300">{user.email} • {user.phone}</p>
            <p className="text-xs text-neutral-400">{user.gender} • {user.age} Yrs • Height: {user.heightCm}cm • Weight: {user.weightKg}kg</p>
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
          <p className="text-2xl font-black text-red-400">{user.bloodGroup}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">Body Mass Index</span>
          <p className="text-2xl font-black text-emerald-400">{user.bmi}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">Height</span>
          <p className="text-2xl font-black text-cyan-400">{user.heightCm} <span className="text-xs text-neutral-400">cm</span></p>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">Weight</span>
          <p className="text-2xl font-black text-purple-400">{user.weightKg} <span className="text-xs text-neutral-400">kg</span></p>
        </div>
      </div>

      {/* Allergies & Conditions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-3xl bg-[#181818] border border-white/10 space-y-3">
          <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" /> Allergies & Drug Hypersensitivity
          </h3>
          <div className="flex flex-wrap gap-2">
            {user.allergies.map((a, i) => (
              <span key={i} className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 font-bold text-xs border border-red-500/30">
                {a}
              </span>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#181818] border border-white/10 space-y-3">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4" /> Medical Conditions
          </h3>
          <div className="flex flex-wrap gap-2">
            {user.medicalConditions.map((c, i) => (
              <span key={i} className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
          Designated Emergency Contacts
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {user.emergencyContacts.map(contact => (
            <div key={contact.id} className="p-4 rounded-2xl bg-neutral-900 border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{contact.name}</p>
                <p className="text-[10px] text-neutral-400">{contact.relation} • {contact.phone}</p>
              </div>
              <a href={`tel:${contact.phone}`} className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                Call
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#181818] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl relative text-white space-y-4">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-white">Edit Health Passport</h3>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Blood Group</label>
                  <input
                    type="text"
                    value={bloodGroup}
                    onChange={e => setBloodGroup(e.target.value)}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(Number(e.target.value))}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={e => setHeight(Number(e.target.value))}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={e => setWeight(Number(e.target.value))}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs shadow-lg transition mt-2"
              >
                Save Changes
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
