import { useState } from "react";
import { supabase } from "../lib/supabase";

const INSTRUMENTS = ["ढोल", "ताशा", "कोणतेच नाही", "ढोल, ताशा"];
const EXPERIENCE_LEVELS = [
  "Fresher",
  "1-3 Years  (१-३ वर्षे)",
  "3-7 Years (३-७ वर्षे)",
  "7 Years and Above (७ किंवा त्या पेक्षा जास्त)",
];

export default function PublicRegistration() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    gender: "Male",
    whatsapp: "",
    parent_contact: "",
    dob: "",
    address: "",
    profession: "",
    injury_info: "No",
    previous_pathak: "",
    instruments_played: "ढोल",
    experience: "Fresher",
    flag_dancing: "नाही",
    other_instruments: "",
    hobbies: "",
    reference: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setErrorMsg("कृपया तुमचे संपूर्ण नाव प्रविष्ट करा (Please enter full name).");
      return;
    }
    if (!formData.whatsapp.trim()) {
      setErrorMsg("कृपया तुमचा व्हॉट्सॲप नंबर प्रविष्ट करा (Please enter WhatsApp number).");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        timestamp: new Date().toISOString().split("T")[0],
        full_name: formData.full_name.trim(),
        email: formData.email.trim() || null,
        gender: formData.gender,
        whatsapp: formData.whatsapp.trim(),
        parent_contact: formData.parent_contact.trim() || null,
        dob: formData.dob || null,
        address: formData.address.trim() || null,
        profession: formData.profession.trim() || null,
        injury_info: formData.injury_info.trim() || "No",
        previous_pathak: formData.previous_pathak.trim() || null,
        instruments_played: formData.instruments_played,
        experience: formData.experience,
        flag_dancing: formData.flag_dancing,
        other_instruments: formData.other_instruments.trim() || null,
        hobbies: formData.hobbies.trim() || null,
        reference: formData.reference.trim() || null,
        exam_status: "pending",
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("new_members").insert([payload]);

      if (error) {
        throw error;
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Registration error:", err);
      setErrorMsg(
        "नोंदणी जतन करताना त्रुटी आली: " +
          (err.message || "Network error. Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-ink-950 text-cream flex items-center justify-center p-4 font-['Outfit',sans-serif]">
        <div className="max-w-md w-full bg-white border border-emerald-200 rounded-3xl p-8 text-center space-y-5 shadow-lift animate-rise">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-4xl mx-auto border border-emerald-500/40 animate-bounce">
            ✅
          </div>
          <div>
            <h2 className="text-2xl font-bold text-cream">अर्ज यशस्वीरीत्या नोंदवला गेला!</h2>
            <p className="text-sm text-emerald-400 font-semibold mt-1">Registration Successful</p>
          </div>
          <p className="text-xs text-mist leading-relaxed">
            जय गणेश! 🙏 <strong className="text-cream">{formData.full_name}</strong>,<br />
            ताल वाद्यपथक - गणेशोत्सव २०२६ सदस्य नोंदणीसाठी धन्यवाद. लवकरच आमची टीम तुमच्याशी संपर्क साधेल.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({
                full_name: "",
                email: "",
                gender: "Male",
                whatsapp: "",
                parent_contact: "",
                dob: "",
                address: "",
                profession: "",
                injury_info: "No",
                previous_pathak: "",
                instruments_played: "ढोल",
                experience: "Fresher",
                flag_dancing: "नाही",
                other_instruments: "",
                hobbies: "",
                reference: "",
              });
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-lg shadow-brand/20 transition-all"
          >
            अजून एक नोंदणी करा (New Form)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 text-cream py-8 px-4 sm:px-6 lg:px-8 font-['Outfit',sans-serif] relative overflow-hidden">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[linear-gradient(180deg,#fff7f7_0%,#f8fafc_42%,#f7f8fa_100%)]" />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-3 relative overflow-hidden shadow-lift">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-brand/45 to-transparent pointer-events-none" />
          <img
            src="/taal-pathak-logo-red.png"
            alt="TAAL Pathak"
            className="h-16 w-auto mx-auto drop-shadow-md"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-cream">
              ताल वाद्यपथक, पुणे
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-brand mt-0.5">
              गणेशोत्सव २०२६ — नवीन सदस्य नोंदणी अर्ज
            </p>
            <p className="text-[11px] text-mist mt-1">
              New Member Candidate Registration Form
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium flex items-center gap-3 animate-shake">
            <span className="text-lg">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-lift">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-brand uppercase tracking-widest border-b border-slate-200 pb-2">
              १. वैयक्तिक माहिती (Personal Information)
            </h3>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                संपूर्ण नाव (Full Name) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                required
                value={formData.full_name}
                onChange={handleChange}
                placeholder="उदा. अमित गजानन केळकर"
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-cream placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
              />
            </div>

            {/* WhatsApp & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  व्हॉट्सॲप नंबर (WhatsApp No.) <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  name="whatsapp"
                  required
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="उदा. 9822000000"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-cream placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  लिंग (Gender)
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-cream focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all cursor-pointer"
                >
                  <option value="Male">Male (पुरुष)</option>
                  <option value="Female">Female (स्त्री)</option>
                  <option value="Other">Other (इतर)</option>
                </select>
              </div>
            </div>

            {/* Email & DOB */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ईमेल (Email Address)
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="myname@gmail.com"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-cream placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  जन्मतारीख (Date of Birth)
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-cream focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
                />
              </div>
            </div>

            {/* Parent Contact & Profession */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  पालकांचा संपर्क क्र. (Parent Contact)
                </label>
                <input
                  type="tel"
                  name="parent_contact"
                  value={formData.parent_contact}
                  onChange={handleChange}
                  placeholder="पालकांचा मोबाईल नंबर"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-cream placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  व्यवसाय / शिक्षण (Profession / Student)
                </label>
                <input
                  type="text"
                  name="profession"
                  value={formData.profession}
                  onChange={handleChange}
                  placeholder="उदा. Student / Service / Business"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-cream placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                संपूर्ण पत्ता (Full Address)
              </label>
              <textarea
                name="address"
                rows={2}
                value={formData.address}
                onChange={handleChange}
                placeholder="तुमचा राहण्याचा पत्ता (पुणे)"
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-cream placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all resize-none"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-brand uppercase tracking-widest border-b border-slate-200 pb-2">
              २. वाद्य व अनुभव माहिती (Instrument & Experience)
            </h3>

            {/* Instrument & Experience */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  कोणते वाद्य वाजवता? (Instrument Choice)
                </label>
                <select
                  name="instruments_played"
                  value={formData.instruments_played}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-cream focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all cursor-pointer"
                >
                  {INSTRUMENTS.map((inst) => (
                    <option key={inst} value={inst}>
                      {inst}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  अनुभव (Experience Level)
                </label>
                <select
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-cream focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all cursor-pointer"
                >
                  {EXPERIENCE_LEVELS.map((exp) => (
                    <option key={exp} value={exp}>
                      {exp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Previous Pathak & Flag Dancing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  मागील वाद्यपथकाचे नाव (Previous Pathak)
                </label>
                <input
                  type="text"
                  name="previous_pathak"
                  value={formData.previous_pathak}
                  onChange={handleChange}
                  placeholder="नसल्यास 'No' लिहा"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-cream placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ध्वज सादरीकरण अनुभव (Flag Dancing)
                </label>
                <select
                  name="flag_dancing"
                  value={formData.flag_dancing}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-cream focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all cursor-pointer"
                >
                  <option value="नाही">नाही (No)</option>
                  <option value="हो">हो (Yes)</option>
                </select>
              </div>
            </div>

            {/* Other Instruments & Hobbies */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  इतर कोणती वाद्ये (Other Instruments)
                </label>
                <input
                  type="text"
                  name="other_instruments"
                  value={formData.other_instruments}
                  onChange={handleChange}
                  placeholder="उदा. झांज, तबला, कॅजोन, No"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-cream placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  संदर्भ / Referred By
                </label>
                <input
                  type="text"
                  name="reference"
                  value={formData.reference}
                  onChange={handleChange}
                  placeholder="कोणाच्या संदर्भाने आलात?"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-cream placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-base shadow-xl shadow-brand/20 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span>⏳ नोंदणी जतन होत आहे... (Saving...)</span>
            ) : (
              <>
                <span>🥁</span>
                <span>फॉर्म सादर करा (Submit Registration)</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
