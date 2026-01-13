
import React, { useState, useEffect, useRef } from 'react';
import { Language, User, Translations, UserRole, Translation } from './types';
import { CATEGORIES as INITIAL_CATEGORIES, GLOBAL_CATEGORIES } from './constants';
import { LanguageSwitch } from './components/LanguageSwitch';

const API_BASE_URL = "https://biyahdaan.onrender.com/api"; 

const AdminDashboard = ({ adminSettings, setAdminSettings, updateBookingStatus }: { adminSettings: any, setAdminSettings: any, updateBookingStatus: any }) => {
    const [adminData, setAdminData] = useState<any>(null);
    const [viewProof, setViewProof] = useState<string | null>(null);

    const fetchAdminData = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/all-data`);
            if (res.ok) setAdminData(await res.json());
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchAdminData(); }, []);

    const saveSettings = async () => {
        await fetch(`${API_BASE_URL}/admin/settings`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(adminSettings)
        });
        alert("System Settings Updated Successfully!");
    };

    if (!adminData) return <div className="p-10 text-center font-black animate-pulse text-blue-600">ACCESSING MASTER DATABASE...</div>;

    return (
        <div className="p-4 space-y-6 pb-32 animate-slideIn">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-blue-50">
                <h3 className="text-[10px] font-black uppercase mb-4 text-gray-400 tracking-widest">Global Payout & Support Config</h3>
                <div className="space-y-3">
                    <p className="text-[9px] font-black text-gray-400 uppercase ml-1">Admin UPI (For 90% Final Payments)</p>
                    <input className="w-full bg-gray-50 p-4 rounded-xl text-xs font-bold" value={adminSettings?.adminUPI} onChange={e => setAdminSettings({...adminSettings, adminUPI: e.target.value})} placeholder="Admin UPI ID" />
                    <p className="text-[9px] font-black text-gray-400 uppercase ml-1">Admin WhatsApp Support (With Country Code)</p>
                    <input className="w-full bg-gray-50 p-4 rounded-xl text-xs font-bold" value={adminSettings?.adminWhatsApp} onChange={e => setAdminSettings({...adminSettings, adminWhatsApp: e.target.value})} placeholder="e.g. 919876543210" />
                    <p className="text-[9px] font-black text-gray-400 uppercase ml-1">System Master Password</p>
                    <input className="w-full bg-gray-50 p-4 rounded-xl text-xs font-bold" type="password" value={adminSettings?.password} onChange={e => setAdminSettings({...adminSettings, password: e.target.value})} placeholder="New Password" />
                    <button onClick={saveSettings} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-lg">Update Master Settings</button>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-gray-100">
                <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase">Master Booking Registry</h3>
                    <button onClick={fetchAdminData} className="text-blue-600 text-[10px] font-black uppercase">Refresh</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100 text-[8px] font-black uppercase text-gray-400">
                            <tr>
                                <th className="p-4">Customer</th>
                                <th className="p-4">Details</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-[10px] font-bold">
                            {adminData.bookings?.map((b: any) => (
                                <tr key={b._id} className="border-b hover:bg-gray-50/50">
                                    <td className="p-4">
                                        <div className="font-black">{b.customerId?.name}</div>
                                        <div className="text-[8px] text-gray-400">{b.customerId?.mobile}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-[9px] font-black truncate w-24">{b.serviceId?.title}</div>
                                        <div className="text-[8px] text-blue-500 font-bold">{b.address}, {b.pincode}</div>
                                        <div className="text-[8px] text-gray-900 font-black">Price: ₹{b.totalAmount}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded uppercase text-[7px] ${b.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>{b.status}</span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            {b.status === 'awaiting_final_verification' && (
                                                <>
                                                  <button onClick={() => setViewProof(b.finalProof)} className="bg-blue-500 text-white p-2 rounded-lg shadow-sm" title="View Proof"><i className="fas fa-eye text-[10px]"></i></button>
                                                  <button onClick={async () => { if(window.confirm("Approve Final Payment? This will unlock the OTP for customer.")) { await updateBookingStatus(b._id, {status: 'final_paid'}); fetchAdminData(); } }} className="bg-green-600 text-white p-2 rounded-lg shadow-sm" title="Approve Payment"><i className="fas fa-check text-[10px]"></i></button>
                                                </>
                                            )}
                                            <button onClick={async () => { if(window.confirm("Cancel this booking?")) { await updateBookingStatus(b._id, {status: 'cancelled'}); fetchAdminData(); } }} className="bg-red-400 text-white p-2 rounded-lg shadow-sm" title="Cancel Booking"><i className="fas fa-times text-[10px]"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {viewProof && (
                <div className="fixed inset-0 bg-black/90 z-[999] flex items-center justify-center p-6 backdrop-blur-md" onClick={() => setViewProof(null)}>
                    <div className="relative max-w-sm w-full animate-slideUp">
                        <img src={viewProof} className="w-full rounded-[2rem] shadow-2xl border-4 border-white" />
                        <p className="text-white text-center mt-4 font-black text-xs uppercase tracking-widest">Tap anywhere to close</p>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                <h3 className="text-[10px] font-black uppercase mb-4 tracking-widest text-gray-400">Live Services</h3>
                <div className="space-y-3">
                    {adminData.services?.map((s: any) => (
                        <div key={s._id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase truncate w-32">{s.title}</span>
                                <span className="text-[8px] text-gray-400 font-bold">{s.vendorId?.businessName}</span>
                            </div>
                            <button onClick={async () => {
                                if(window.confirm("Delete this service permanently?")) {
                                    await fetch(`${API_BASE_URL}/services/${s._id}`, {method:'DELETE'});
                                    fetchAdminData();
                                }
                            }} className="text-red-500 bg-white w-8 h-8 rounded-full shadow-sm flex items-center justify-center"><i className="fas fa-trash-alt text-[10px]"></i></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  // ADDED: Splash and Custom Category states
  const [showSplash, setShowSplash] = useState(true);
  const [isOtherCategory, setIsOtherCategory] = useState(false);

  const [lang, setLang] = useState<Language>(Language.EN);
  const [user, setUser] = useState<User | null>(null);
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [view, setView] = useState<'home' | 'vendor-dashboard' | 'bookings' | 'my-services' | 'wishlist'>('home');
  const [data, setData] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [myServices, setMyServices] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishStatus, setPublishStatus] = useState<string>(''); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminSettings, setAdminSettings] = useState<any>({ adminUPI: 'admin@okaxis', adminWhatsApp: '910000000000', password: '123' });

  const [bookingTarget, setBookingTarget] = useState<any>(null);
  const [detailTarget, setDetailTarget] = useState<any>(null); 
  const [otpTarget, setOtpTarget] = useState<{id: string, code: string, correctCode: string} | null>(null);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  
  const [authForm, setAuthForm] = useState({ identifier: '', email: '', mobile: '', password: '', name: '', role: 'user' });
  const [serviceForm, setServiceForm] = useState({
    title: '', category: 'tent', description: '', rate: '', unitType: 'Per Day', 
    inventoryList: [] as {name: string, qty: string}[], images: [] as string[], contactNumber: '', _id: '', 
    upiId: '', variant: 'Simple', blockedDates: [] as string[]
  });
  const [customItem, setCustomItem] = useState({ name: '', qty: '' });
  const [bookingForm, setBookingForm] = useState({ startDate: '', endDate: '', address: '', pincode: '', altMobile: '' });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const finalProofInputRef = useRef<HTMLInputElement>(null);

  // ADDED: Splash timer
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width; let height = img.height;
        const max_dim = 1200; 
        if (width > height) { if (width > max_dim) { height *= max_dim / width; width = max_dim; } } 
        else { if (height > max_dim) { width *= max_dim / height; height = max_dim; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Voice Search not supported.");
    const recognition = new SpeechRecognition();
    recognition.lang = lang === Language.HI ? 'hi-IN' : 'en-US';
    recognition.start();
    setIsListening(true);
    recognition.onresult = (event: any) => {
      setSearchQuery(event.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('gramcart_user');
    setUser(null);
    setVendorProfile(null);
    setView('home');
    setAuthMode('login');
    setIsAdminMode(false);
  };

  const filteredData = data.filter(vendor => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = vendor.businessName?.toLowerCase().includes(searchLower) || 
                          vendor.services?.some((s: any) => s.title?.toLowerCase().includes(searchLower));
    if (userCoords && vendor.location) {
        const dist = calculateDistance(userCoords.lat, userCoords.lng, vendor.location.lat, vendor.location.lng);
        return matchesSearch && dist <= 25;
    }
    return matchesSearch;
  });

  useEffect(() => {
    const saved = localStorage.getItem('gramcart_user');
    if (saved) {
      try {
        const parsedUser = JSON.parse(saved);
        setUser(parsedUser);
        if (parsedUser.role === 'vendor') fetchVendorProfile(parsedUser._id || parsedUser.id);
        const savedWish = localStorage.getItem(`wish_${parsedUser._id || parsedUser.id}`);
        if (savedWish) setWishlist(JSON.parse(savedWish));
      } catch (e) { localStorage.removeItem('gramcart_user'); }
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("Location access denied")
      );
    }
    fetchData();
    fetch(`${API_BASE_URL}/admin/settings`).then(r => r.json()).then(setAdminSettings).catch(e => {});
  }, []);

  const fetchVendorProfile = async (userId: string) => {
    try {
        const res = await fetch(`${API_BASE_URL}/search`);
        const allVendors = await res.json();
        const v = allVendors.find((vend: any) => vend.userId === userId);
        if (v) setVendorProfile(v);
    } catch (e) {}
  };

  const fetchData = async (cat: string = '') => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/search?cat=${cat}`);
      if (res.ok) setData(await res.json());
    } catch (e) {} finally { setLoading(false); }
  };

  const fetchBookings = async () => {
    if (!user) return;
    const res = await fetch(`${API_BASE_URL}/my-bookings/${user.role}/${user._id || user.id}`);
    if (res.ok) setBookings(await res.json());
  };

  const fetchMyServices = async () => {
    if (!user || user.role !== 'vendor') return;
    const vRes = await fetch(`${API_BASE_URL}/search`);
    const allV = await vRes.json();
    const v = allV.find((vend: any) => vend.userId === (user._id || user.id));
    if (v) {
        const res = await fetch(`${API_BASE_URL}/my-services/${v._id}`);
        if (res.ok) setMyServices(await res.json());
    }
  };

  useEffect(() => {
    if (user) {
      fetchBookings();
      if (user.role === UserRole.VENDOR) fetchMyServices();
    }
  }, [user, view]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authForm.identifier === "SUPERADMIN" && !isAdminMode) {
        setIsAdminMode(true);
        setAuthForm({...authForm, identifier: ''}); 
        return;
    }
    setLoading(true);
    if (isAdminMode) {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/settings`);
            const settings = await res.json();
            if (authForm.password === settings.password) {
                const adminUser = { id: 'admin', name: 'Master Control', role: UserRole.ADMIN, email: 'admin@gramcart.com' };
                localStorage.setItem('gramcart_user', JSON.stringify(adminUser));
                setUser(adminUser);
                setAdminSettings(settings);
                setView('home'); 
                setLoading(false);
                return;
            } else { alert("Invalid Master Password"); setLoading(false); return; }
        } catch (err) { setLoading(false); return; }
    }
    const endpoint = authMode === 'login' ? '/login' : '/register';
    const payload = authMode === 'login' ? { identifier: authForm.identifier, password: authForm.password } : { ...authForm, location: userCoords };
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (res.ok) {
        localStorage.setItem('gramcart_user', JSON.stringify(result.user));
        setUser(result.user);
        if (result.user.role === 'vendor') fetchVendorProfile(result.user._id || result.user.id);
        setView(result.user.role === 'vendor' ? 'vendor-dashboard' : 'home');
      } else alert(result.error);
    } catch (err) {} finally { setLoading(false); }
  };

  const handleAddOrUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ADDED: Compulsory validation
    if (!serviceForm.contactNumber || serviceForm.contactNumber.length < 10) {
        alert("❌ COMPULSORY: Please add a valid 10-digit mobile number to list this service.");
        return;
    }
    if (!serviceForm.category) {
        alert("❌ Please select or enter a category.");
        return;
    }

    if (!user) return alert("Please login");
    setLoading(true); setPublishStatus('Syncing Service...');
    try {
      const compressedImages = await Promise.all(serviceForm.images.map(img => img.startsWith('data:image') ? compressImage(img) : img));
      const vRes = await fetch(`${API_BASE_URL}/search`);
      const allV = await vRes.json();
      const v = allV.find((vend: any) => vend.userId === (user._id || user.id));
      if (!v) throw new Error("Profile missing");

      const payload = {
        ...serviceForm, images: compressedImages, vendorId: v._id,
        rate: Number(serviceForm.rate)
      };

      const isUpdating = !!serviceForm._id;
      const res = await fetch(`${API_BASE_URL}${isUpdating ? `/services/${serviceForm._id}` : '/services'}`, {
        method: isUpdating ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setPublishStatus('Live!');
        setTimeout(() => {
          setServiceForm({ title: '', category: 'tent', description: '', rate: '', unitType: 'Per Day', inventoryList: [], images: [], contactNumber: '', _id: '', upiId: '', variant: 'Simple', blockedDates: [] });
          setPublishStatus(''); fetchMyServices(); setView('vendor-dashboard'); setLoading(false);
          setIsOtherCategory(false);
        }, 1500);
      }
    } catch (e) { alert("Save failed"); setLoading(false); }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !bookingTarget) return;
    const start = new Date(bookingForm.startDate);
    const end = new Date(bookingForm.endDate);
    const isBlocked = bookingTarget.blockedDates?.some((d: string) => {
        const blocked = new Date(d);
        return blocked >= start && blocked <= end;
    });
    if (isBlocked) return alert("Error: These dates were just booked by someone else!");

    setLoading(true);
    try {
      const vRes = await fetch(`${API_BASE_URL}/search`);
      const allV = await vRes.json();
      const v = allV.find((vend: any) => vend.services.some((s: any) => s._id === bookingTarget._id));
      const res = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...bookingForm, 
          customerId: user._id || user.id, 
          vendorId: v._id, 
          serviceId: bookingTarget._id, 
          totalAmount: bookingTarget.rate, 
          otp: Math.floor(1000 + Math.random() * 9000).toString() 
        })
      });
      if (res.ok) { setBookingTarget(null); setView('bookings'); fetchBookings(); }
    } catch (e) {} finally { setLoading(false); }
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>, bookingId: string, field: 'advanceProof' | 'finalProof') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      setLoading(true);
      const compressed = await compressImage(reader.result as string);
      const status = field === 'advanceProof' ? 'awaiting_advance_verification' : 'awaiting_final_verification';
      await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ [field]: compressed, status }) 
      });
      fetchBookings(); setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const updateBookingStatus = async (id: string, payload: any) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${id}/status`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      if (res.ok) fetchBookings();
    } catch (e) {} finally { setLoading(false); }
  };

  const handleVendorVerification = async (bookingId: string, nextStatus: string) => {
    await updateBookingStatus(bookingId, { status: nextStatus, isVerified: true });
    alert("Payment Verified Successfully!");
  };

  const toggleWishlist = (id: string) => {
    if (!user) return;
    const newWish = wishlist.includes(id) ? wishlist.filter(i => i !== id) : [...wishlist, id];
    setWishlist(newWish);
    localStorage.setItem(`wish_${user._id || user.id}`, JSON.stringify(newWish));
  };

  const Stepper = ({ status }: { status: string }) => {
    const steps = ['pending', 'approved', 'advance_paid', 'final_paid', 'completed'];
    const map: Record<string, string> = { 'awaiting_advance_verification': 'approved', 'awaiting_final_verification': 'advance_paid' };
    const currentIndex = steps.indexOf(map[status] || status);
    return (
      <div className="flex items-center justify-between w-full mb-8 relative px-2">
        <div className="absolute top-[14px] left-0 right-0 h-[1px] bg-gray-100 -z-10"></div>
        {steps.map((step, idx) => (
          <div key={step} className="flex flex-col items-center flex-1">
            <div className={`w-7 h-7 rounded-full border-4 border-white shadow-sm flex items-center justify-center text-[8px] font-black ${idx <= currentIndex ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {idx < currentIndex ? <i className="fas fa-check"></i> : idx + 1}
            </div>
            <span className={`text-[6px] mt-2 font-black uppercase ${idx <= currentIndex ? 'text-green-600' : 'text-gray-300'}`}>{step.split('_')[0]}</span>
          </div>
        ))}
      </div>
    );
  };

  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#2874f0] flex items-center justify-center p-6">
        <div className="bg-white w-full p-8 rounded-[2rem] shadow-2xl animate-slideUp">
          <div className="text-center mb-8"><h1 className="text-4xl font-black text-[#2874f0] italic tracking-tighter">GramCart</h1></div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && !isAdminMode && (
              <><input placeholder="Full Name" className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold" onChange={e => setAuthForm({...authForm, name: e.target.value})} required /><input placeholder="Mobile Number" className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold" onChange={e => setAuthForm({...authForm, mobile: e.target.value})} required /></>
            )}
            {!isAdminMode && (
                <input placeholder="Email or Mobile" className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold" value={authForm.identifier} onChange={e => setAuthForm({...authForm, identifier: e.target.value})} required />
            )}
            {(authMode === 'login' || isAdminMode) && (
                <input placeholder={isAdminMode ? "System Master Password" : "Password"} type="password" className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold" onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
            )}
            {authMode === 'register' && !isAdminMode && (
              <div className="flex gap-2 p-1 bg-gray-50 rounded-xl">
                {['user', 'vendor'].map(r => (
                  <button key={r} type="button" onClick={() => setAuthForm({...authForm, role: r})} className={`flex-1 py-2 rounded-lg text-xs font-black ${authForm.role === r ? 'bg-[#2874f0] text-white shadow-lg' : 'text-gray-400'}`}>{r.toUpperCase()}</button>
                ))}
              </div>
            )}
            <button className="w-full py-5 rounded-xl font-black text-white bg-[#fb641b] shadow-xl uppercase text-xs tracking-widest">{loading ? 'Please wait...' : (isAdminMode ? 'System Access' : (authMode === 'login' ? 'Login' : 'Sign Up'))}</button>
          </form>
          {!isAdminMode && (
            <p className="text-center mt-6 text-[11px] font-black text-[#2874f0] cursor-pointer" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? "New User? Register Now" : "Back to Login"}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#f1f3f6] pb-24 relative overflow-x-hidden">
      
      {/* ADDED: Splash screen UI */}
      {showSplash && (
        <div className="fixed inset-0 bg-gradient-to-br from-[#2874f0] to-[#1e5bb8] z-[9999] flex flex-col items-center justify-center animate-pulse">
            <div className="text-center animate-bounce">
            <h1 className="text-6xl font-black text-white italic tracking-tighter drop-shadow-2xl">GramCart</h1>
            <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.3em] mt-4">Rural Hyper-local Marketplace</p>
            </div>
            <div className="absolute bottom-12 flex gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-150"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-300"></div>
            </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-[#2874f0] p-4 text-white sticky top-0 z-[100] shadow-md rounded-b-[1.5rem]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3"><i className="fas fa-bars text-xl"></i><h1 className="text-2xl font-black italic tracking-tighter">GramCart</h1></div>
          <div className="flex items-center gap-3">
             {user.role === UserRole.VENDOR && (
                 <div className="relative cursor-pointer mr-1" onClick={() => setView('bookings')}>
                    <i className="fas fa-bell text-lg"></i>
                    {pendingCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[7px] font-bold w-3 h-3 flex items-center justify-center rounded-full animate-bounce">{pendingCount}</span>}
                 </div>
             )}
             <LanguageSwitch current={lang} onChange={setLang} />
          </div>
        </div>
        {user.role !== UserRole.ADMIN && (
            <div className="relative">
                <input placeholder={Translations[lang].searchPlaceholder} className="w-full bg-white text-gray-800 p-4 pl-12 pr-14 rounded-xl text-sm outline-none font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
                <button onClick={startVoiceSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2874f0] w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full shadow-md"><i className={`fas fa-microphone ${isListening ? 'text-red-500 animate-pulse' : ''}`}></i></button>
            </div>
        )}
      </header>

      {/* Main Content */}
      <main className="p-4">
        {user.role === UserRole.ADMIN ? (
            <AdminDashboard adminSettings={adminSettings} setAdminSettings={setAdminSettings} updateBookingStatus={updateBookingStatus} />
        ) : (
          <>
            {view === 'home' && (
              <div className="space-y-6">
                <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                    {categories.map(c => (
                        <button key={c.id} onClick={() => fetchData(c.id)} className="flex flex-col items-center gap-2 min-w-[85px]">
                            <div className={`w-14 h-14 rounded-2xl ${c.color} flex items-center justify-center shadow-md border-2 border-white`}><i className={`fas ${c.icon} text-lg`}></i></div>
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{c.name}</span>
                        </button>
                    ))}
                </div>
                {filteredData.map(vendor => (
                  <div key={vendor._id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 mb-6">
                    <div className="flex justify-between items-center mb-5">
                        <div>
                            <h4 className="font-black text-gray-800 text-lg leading-tight">{vendor.businessName}</h4>
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1"><i className="fas fa-location-dot mr-1"></i> {userCoords && vendor.location ? `${calculateDistance(userCoords.lat, userCoords.lng, vendor.location.lat, vendor.location.lng).toFixed(1)} KM Away` : 'Nearby'}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {vendor.services?.map((s: any) => (
                        <div key={s._id} className="border border-gray-50 p-2.5 rounded-3xl bg-gray-50/50 relative shadow-sm">
                            <button onClick={() => toggleWishlist(s._id)} className="absolute top-4 right-4 z-10"><i className={`fas fa-heart ${wishlist.includes(s._id) ? 'text-red-500' : 'text-gray-200'}`}></i></button>
                            <img src={s.images?.[0] || 'https://via.placeholder.com/300'} className="h-32 w-full object-cover rounded-2xl mb-3 cursor-pointer" onClick={() => {setDetailTarget(s); setActiveImageIdx(0);}} />
                            <p className="text-[11px] font-black text-gray-700 truncate mb-1 uppercase tracking-tighter">{s.title}</p>
                            <p className="text-[#2874f0] font-black text-sm">₹{s.rate}/- <span className="text-[8px] text-gray-400 font-bold uppercase">{s.unitType}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {view === 'vendor-dashboard' && (
              <div className="space-y-6 animate-slideIn">
                  <div className="bg-gradient-to-br from-[#2874f0] to-[#1e5bbd] p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">Total Business Done</p>
                      <h2 className="text-4xl font-black italic">₹{bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.totalAmount || 0), 0)}</h2>
                      <i className="fas fa-wallet absolute -bottom-4 -right-4 text-white/10 text-9xl"></i>
                  </div>

                  <div className="bg-white p-6 rounded-[2.5rem] shadow-sm mb-6 border border-green-50">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-black uppercase text-[10px] tracking-widest text-gray-400">Settlement Hub</h3>
                          <i className="fas fa-university text-green-500"></i>
                      </div>
                      <div className="space-y-4">
                          <div className="flex flex-col gap-2">
                              <p className="text-[9px] font-black text-gray-400 uppercase ml-1">Your Payout UPI ID</p>
                              <input 
                                  placeholder="example@upi" 
                                  className="bg-gray-50 p-4 rounded-xl text-xs font-black border-none shadow-inner"
                                  value={vendorProfile?.upiId || ''}
                                  onChange={(e) => setVendorProfile({...vendorProfile, upiId: e.target.value})}
                              />
                          </div>
                          <button 
                              onClick={async () => {
                                  if(!vendorProfile?.upiId) return alert("Please enter UPI ID first");
                                  setLoading(true);
                                  try {
                                    const res = await fetch(`${API_BASE_URL}/vendors/${vendorProfile._id}`, {
                                        method: 'PATCH',
                                        headers: {'Content-Type': 'application/json'},
                                        body: JSON.stringify({ upiId: vendorProfile.upiId })
                                    });
                                    if(res.ok) alert("Withdrawal Request Initiated & Payout UPI Saved!");
                                  } catch(e) { alert("Update failed"); }
                                  setLoading(false);
                              }}
                              className="w-full bg-green-500 text-white py-4 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-green-100"
                          >
                              {loading ? 'Processing...' : 'Withdraw to UPI'}
                          </button>
                      </div>
                  </div>

                  <div className="bg-white p-6 rounded-[2.5rem] shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-black uppercase text-xs tracking-widest">Listings</h3>
                          <button onClick={() => { 
                              setServiceForm({ title: '', category: 'tent', description: '', rate: '', unitType: 'Per Day', inventoryList: [], images: [], contactNumber: '', _id: '', upiId: '', variant: 'Simple', blockedDates: [] });
                              setView('my-services'); 
                          }} className="bg-[#fb641b] text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase">Add New</button>
                      </div>
                      <div className="space-y-4">
                          {myServices.map(s => (
                              <div key={s._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                  <img src={s.images[0]} className="w-14 h-14 rounded-xl object-cover" />
                                  <div className="flex-1">
                                      <p className="text-[12px] font-black truncate w-32 uppercase tracking-tighter">{s.title}</p>
                                      <p className="text-[10px] text-[#2874f0] font-bold">₹{s.rate}</p>
                                  </div>
                                  <div className="flex gap-2">
                                      <button onClick={() => { setServiceForm(s); setView('my-services'); }} className="text-blue-500 p-2"><i className="fas fa-edit"></i></button>
                                      <button onClick={async () => { if(window.confirm("Remove?")) await fetch(`${API_BASE_URL}/services/${s._id}`, {method: 'DELETE'}); fetchMyServices(); }} className="text-red-400 p-2"><i className="fas fa-trash-alt"></i></button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
            )}

            {view === 'my-services' && (
               <div className="bg-white p-6 rounded-[2.5rem] shadow-sm animate-slideIn">
                  <h3 className="text-sm font-black text-[#2874f0] uppercase mb-8 tracking-widest text-center border-b pb-4">Service Editor</h3>
                  <form onSubmit={handleAddOrUpdateService} className="space-y-6">
                     <div className="bg-blue-50/50 p-6 rounded-[2rem] border-2 border-dashed border-blue-200">
                        <input type="file" multiple className="hidden" ref={fileInputRef} onChange={(e) => {
                           const files = e.target.files; if(!files) return;
                           Array.from(files).forEach(f => {
                             const r = new FileReader();
                             r.onloadend = () => setServiceForm(p => ({...p, images: [...p.images, r.result as string].slice(0, 5)}));
                             r.readAsDataURL(f);
                           });
                        }} />
                        <div className="flex flex-wrap gap-2">
                           {serviceForm.images.map((img, i) => (
                              <div key={i} className="relative w-14 h-14"><img src={img} className="w-full h-full object-cover rounded-xl" /><button type="button" onClick={() => setServiceForm(p=>({...p, images: p.images.filter((_,idx)=>idx!==i)}))} className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full text-[8px]"><i className="fas fa-times"></i></button></div>
                           ))}
                           {serviceForm.images.length < 5 && (
                              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-14 h-14 rounded-xl bg-white border border-blue-200 text-blue-400 flex items-center justify-center"><i className="fas fa-camera"></i></button>
                           )}
                        </div>
                     </div>
                     
                     <input 
                        placeholder="Service Title (e.g. Royal Buffet)" 
                        className="w-full bg-gray-50 p-4 rounded-xl font-bold" 
                        value={serviceForm.title} 
                        onChange={e => setServiceForm({...serviceForm, title: e.target.value})} 
                        required 
                     />
                     
                     {/* ADDED: Dynamic category select with "Other" */}
                     <div className="grid grid-cols-2 gap-4">
                        <select 
                            className="w-full bg-gray-50 p-4 rounded-xl font-bold text-xs" 
                            value={isOtherCategory ? 'other' : serviceForm.category} 
                            onChange={e => {
                                if(e.target.value === 'other') {
                                    setIsOtherCategory(true);
                                    setServiceForm({...serviceForm, category: ''});
                                } else {
                                    setIsOtherCategory(false);
                                    setServiceForm({...serviceForm, category: e.target.value, inventoryList: []});
                                }
                            }}
                        >
                            {Object.entries(GLOBAL_CATEGORIES).map(([id, cat]) => (
                                <option key={id} value={id}>{cat.name}</option>
                            ))}
                            <option value="other">➕ Other / Add New</option>
                        </select>
                        <input placeholder="Rate (₹)" type="number" className="w-full bg-gray-50 p-4 rounded-xl font-bold" value={serviceForm.rate} onChange={e => setServiceForm({...serviceForm, rate: e.target.value})} required />
                     </div>

                     {isOtherCategory && (
                        <input 
                            placeholder="Enter Custom Category Name" 
                            className="w-full bg-blue-50 p-4 rounded-xl font-black text-xs border border-blue-200 animate-slideIn"
                            value={serviceForm.category}
                            onChange={e => setServiceForm({...serviceForm, category: e.target.value})}
                            required
                        />
                     )}

                     {/* ADDED: Compulsory Mobile Field */}
                     <div className="space-y-1">
                        <p className="text-[9px] font-black text-red-500 uppercase ml-2">Contact Number (Compulsory)*</p>
                        <input 
                            placeholder="Vendor Mobile Number" 
                            className="w-full bg-white p-4 rounded-xl font-bold border-2 border-gray-100 focus:border-blue-500" 
                            value={serviceForm.contactNumber} 
                            onChange={e => setServiceForm({...serviceForm, contactNumber: e.target.value})} 
                            required 
                        />
                     </div>

                     <div className="bg-gray-50/50 p-5 rounded-[2rem] border border-gray-100">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 mb-4 tracking-widest">Included Items</h4>
                        <div className="grid grid-cols-1 gap-2">
                            {GLOBAL_CATEGORIES[serviceForm.category]?.items.map(item => {
                                const isSelected = serviceForm.inventoryList.some(i => i.name === item);
                                return (
                                    <div key={item} className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded accent-blue-600"
                                            checked={isSelected}
                                            onChange={(e) => {
                                                if(e.target.checked) {
                                                    setServiceForm({...serviceForm, inventoryList: [...serviceForm.inventoryList, {name: item, qty: '1'}]});
                                                } else {
                                                    setServiceForm({...serviceForm, inventoryList: serviceForm.inventoryList.filter(i => i.name !== item)});
                                                }
                                            }}
                                        />
                                        <span className="flex-1 text-[11px] font-bold text-gray-700">{item}</span>
                                        {isSelected && (
                                            <input 
                                                placeholder="Qty" 
                                                className="w-16 bg-gray-50 p-1 rounded-lg text-[10px] text-center font-black border"
                                                value={serviceForm.inventoryList.find(i => i.name === item)?.qty || ''}
                                                onChange={(e) => {
                                                    setServiceForm({...serviceForm, inventoryList: serviceForm.inventoryList.map(i => i.name === item ? {...i, qty: e.target.value} : i)});
                                                }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <p className="text-[9px] font-black text-gray-400 uppercase mb-3">Add Custom Item</p>
                            <div className="flex gap-2">
                                <input placeholder="Item Name" className="flex-1 bg-white p-3 rounded-xl text-[10px] font-bold border" value={customItem.name} onChange={e => setCustomItem({...customItem, name: e.target.value})} />
                                <input placeholder="Qty" className="w-16 bg-white p-3 rounded-xl text-[10px] font-bold border" value={customItem.qty} onChange={e => setCustomItem({...customItem, qty: e.target.value})} />
                                <button type="button" onClick={() => {
                                    if(!customItem.name) return;
                                    setServiceForm({...serviceForm, inventoryList: [...serviceForm.inventoryList, customItem]});
                                    setCustomItem({name: '', qty: ''});
                                }} className="bg-blue-600 text-white w-10 h-10 rounded-xl flex items-center justify-center"><i className="fas fa-plus"></i></button>
                            </div>
                        </div>
                     </div>

                     <textarea placeholder="Description..." className="w-full bg-gray-50 p-5 rounded-xl h-24 text-xs font-bold" value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} />
                     
                     <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
                            loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#fb641b] text-white'
                        }`}
                     >
                        {loading ? 'Syncing...' : (serviceForm._id ? 'Update Service' : 'Go Live Now')}
                     </button>
                  </form>
               </div>
            )}

            {view === 'bookings' && (
               <div className="space-y-6">
                   <h2 className="text-xl font-black text-gray-800 border-l-8 border-[#fb641b] pl-4 mb-6 uppercase tracking-tighter">My Orders</h2>
                   {bookings.map(b => (
                      <div key={b._id} className="bg-white p-6 rounded-[2.5rem] shadow-sm mb-6 border border-gray-100">
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                  <p className="text-[9px] font-black text-[#2874f0] uppercase tracking-widest mb-1">{b.serviceId?.title}</p>
                                  <h4 className="font-black text-gray-800">{user.role === 'vendor' ? b.customerId?.name : b.vendorId?.businessName}</h4>
                              </div>
                              <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full ${b.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>{b.status.replace('_',' ')}</span>
                          </div>
                          <Stepper status={b.status} />
                          <div className="mt-4 space-y-2">
                              {user.role === UserRole.USER && (
                                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 mb-4">
                                      {b.status === 'approved' && (
                                        <>
                                            <p className="text-[9px] font-black text-blue-800 uppercase mb-2 tracking-widest">Phase 1: Advance (10% to Vendor)</p>
                                            <p className="text-xs font-bold mb-3">Pay UPI: <span className="text-blue-600">{b.vendorId?.upiId || 'Vendor UPI'}</span></p>
                                            <button onClick={() => proofInputRef.current?.click()} className="w-full bg-blue-600 text-white py-3 rounded-xl text-[10px] font-black uppercase shadow-sm">Upload Screenshot</button>
                                        </>
                                      )}
                                      {b.status === 'advance_paid' && (
                                        <>
                                            <p className="text-[9px] font-black text-orange-800 uppercase mb-2 tracking-widest">Phase 2: Final (90% to Admin)</p>
                                            <p className="text-xs font-bold mb-3">Pay UPI: <span className="text-orange-600">{adminSettings?.adminUPI || 'admin@okaxis'}</span></p>
                                            <button onClick={() => finalProofInputRef.current?.click()} className="w-full bg-orange-500 text-white py-3 rounded-xl text-[10px] font-black uppercase shadow-sm">Upload Final Bill Proof</button>
                                        </>
                                      )}
                                      {b.status === 'final_paid' && (
                                          <div className="bg-green-50 p-6 rounded-3xl text-center border-2 border-dashed border-green-200 animate-bounce">
                                              <p className="text-[10px] font-black text-green-700 uppercase mb-2">Payment Approved! Share OTP with Vendor</p>
                                              <h3 className="text-4xl font-black text-green-600 tracking-[0.8rem] ml-3">{b.otp}</h3>
                                          </div>
                                      )}
                                  </div>
                              )}
                              {user.role === UserRole.VENDOR && (
                                  <>
                                    {b.status === 'pending' && <button onClick={() => updateBookingStatus(b._id, {status: 'approved'})} className="w-full bg-green-500 text-white py-4 rounded-xl text-[10px] font-black uppercase">Accept Order</button>}
                                    {b.status === 'awaiting_advance_verification' && (
                                        <div className="space-y-2">
                                            <button onClick={() => setScreenshotPreview(b.advanceProof)} className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl text-[10px] font-black uppercase border border-blue-200">View Screenshot</button>
                                            <button onClick={() => handleVendorVerification(b._id, 'advance_paid')} className="w-full bg-green-500 text-white py-3 rounded-xl text-[10px] font-black uppercase shadow-md">Verify Advance Payment</button>
                                        </div>
                                    )}
                                    {b.status === 'final_paid' && (
                                        <button onClick={() => setOtpTarget({ id: b._id, code: '', correctCode: b.otp })} className="w-full bg-green-600 text-white py-4 rounded-xl text-[10px] font-black uppercase shadow-lg">Verify Completion OTP</button>
                                    )}
                                  </>
                              )}
                          </div>
                      </div>
                   ))}
               </div>
            )}
          </>
        )}
      </main>

      {bookingTarget && (
        <div className="fixed inset-0 bg-black/60 z-[400] flex items-center justify-center p-6 backdrop-blur-sm overflow-y-auto">
           <div className="bg-white w-full rounded-[2.5rem] p-10 animate-slideUp shadow-2xl">
              <h2 className="text-xl font-black uppercase mb-8">Booking Details</h2>
              <form onSubmit={handleBooking} className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><p className="text-[8px] font-black text-gray-400 uppercase">Start</p><input type="date" className="w-full bg-gray-50 p-4 rounded-xl text-xs font-black" required onChange={e => setBookingForm({...bookingForm, startDate: e.target.value})} /></div>
                    <div className="space-y-1"><p className="text-[8px] font-black text-gray-400 uppercase">End</p><input type="date" className="w-full bg-gray-50 p-4 rounded-xl text-xs font-black" required onChange={e => setBookingForm({...bookingForm, endDate: e.target.value})} /></div>
                 </div>
                 <textarea placeholder="Detailed Event Address..." className="w-full bg-gray-50 p-5 rounded-xl text-xs font-black h-24" required onChange={e => setBookingForm({...bookingForm, address: e.target.value})} />
                 {(() => {
                    const start = new Date(bookingForm.startDate);
                    const end = new Date(bookingForm.endDate);
                    const isConflict = bookingTarget.blockedDates?.some((d: string) => {
                        const blocked = new Date(d);
                        return blocked >= start && blocked <= end;
                    });
                    return (
                        <div className="space-y-3">
                            {isConflict && <p className="text-center text-[10px] font-black text-red-500 uppercase animate-pulse">⚠️ Service not available for selected dates.</p>}
                            <button type="submit" disabled={isConflict} className={`w-full py-6 rounded-2xl font-black uppercase text-xs shadow-2xl tracking-widest transition-all ${isConflict ? 'bg-gray-300 grayscale cursor-not-allowed' : 'bg-[#fb641b] text-white hover:scale-105'}`}>
                                {isConflict ? 'Already Booked' : 'Confirm Booking'}
                            </button>
                        </div>
                    );
                 })()}
              </form>
              <button onClick={() => setBookingTarget(null)} className="w-full text-gray-400 mt-4 text-[10px] font-black uppercase">Close</button>
           </div>
        </div>
      )}

      {detailTarget && (
          <div className="fixed inset-0 bg-black/95 z-[500] overflow-y-auto">
              <div className="max-w-md mx-auto min-h-screen bg-white relative pb-32">
                  <button onClick={() => setDetailTarget(null)} className="absolute top-6 left-6 z-[510] text-white w-10 h-10 bg-black/30 rounded-full"><i className="fas fa-arrow-left"></i></button>
                  <img src={detailTarget.images[activeImageIdx]} className="h-[40vh] w-full object-cover" />
                  <div className="p-8 space-y-6">
                      <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">{detailTarget.title}</h1>
                      <p className="text-3xl font-black text-gray-900 italic">₹{detailTarget.rate}/-</p>
                      
                      {detailTarget.inventoryList && detailTarget.inventoryList.length > 0 && (
                          <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100">
                              <h4 className="text-[10px] font-black uppercase text-blue-600 mb-4 tracking-widest flex items-center gap-2"><i className="fas fa-list-check"></i> What's Included / Inventory</h4>
                              <div className="space-y-3">
                                  {detailTarget.inventoryList.map((item: any, idx: number) => (
                                      <div key={idx} className="flex justify-between items-center pb-2 border-b border-blue-100/50 last:border-0">
                                          <span className="text-[11px] font-bold text-gray-700">{item.name}</span>
                                          <span className="bg-white px-2 py-0.5 rounded text-[10px] font-black text-blue-600 shadow-sm">x{item.qty}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      {detailTarget.blockedDates && detailTarget.blockedDates.length > 0 && (
                          <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                              <h4 className="text-[10px] font-black uppercase text-red-600 mb-2 tracking-widest">Booked Dates</h4>
                              <div className="flex flex-wrap gap-2">
                                  {detailTarget.blockedDates.map((d: string) => <span key={d} className="text-[9px] font-bold text-red-500 bg-white px-2 py-1 rounded-lg shadow-sm border border-red-50">Already Booked on {d}</span>)}
                              </div>
                          </div>
                      )}

                      <div className="bg-gray-50 p-6 rounded-[2rem]"><p className="text-xs font-bold text-gray-600 leading-relaxed">{detailTarget.description}</p></div>
                  </div>
                  <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white border-t border-gray-100 flex gap-4 z-[520]">
                      <button onClick={() => toggleWishlist(detailTarget._id)} className="flex-1 py-5 border-2 border-gray-100 rounded-2xl text-[10px] font-black uppercase">{wishlist.includes(detailTarget._id) ? 'Saved' : 'Wishlist'}</button>
                      <button onClick={() => { setBookingTarget(detailTarget); setDetailTarget(null); }} className="flex-2 bg-[#fb641b] text-white py-5 rounded-2xl text-[10px] font-black uppercase shadow-xl">Book Now</button>
                  </div>
              </div>
          </div>
      )}

      <a 
        href={`https://wa.me/${adminSettings?.adminWhatsApp || '910000000000'}?text=Hello GramCart Support, I need help with my booking.`} 
        target="_blank" 
        rel="noreferrer"
        className="fixed bottom-28 right-6 w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-2xl z-[400] animate-bounce"
      >
        <i className="fab fa-whatsapp text-3xl"></i>
      </a>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white h-24 flex items-center justify-around shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.1)] z-[300] rounded-t-[3.5rem] px-8 border-t border-gray-100">
        <button onClick={() => setView('home')} className={`flex flex-col items-center gap-2 ${view === 'home' ? 'text-[#2874f0]' : 'text-gray-300'}`}><i className="fas fa-home text-xl"></i><span className="text-[8px] font-black uppercase">Home</span></button>
        <button onClick={() => setView('bookings')} className={`flex flex-col items-center gap-2 ${view === 'bookings' ? 'text-[#2874f0]' : 'text-gray-300'}`}><i className="fas fa-shopping-bag text-xl"></i><span className="text-[8px] font-black uppercase">Orders</span></button>
        {user.role === UserRole.VENDOR && (
          <button onClick={() => setView('vendor-dashboard')} className={`flex flex-col items-center gap-2 ${view === 'vendor-dashboard' ? 'text-[#2874f0]' : 'text-gray-300'}`}><i className="fas fa-chart-line text-xl"></i><span className="text-[8px] font-black uppercase">Hub</span></button>
        )}
        <button onClick={handleLogout} className="text-red-300 flex flex-col items-center gap-2"><i className="fas fa-power-off text-xl"></i><span className="text-[8px] font-black uppercase">Logout</span></button>
      </nav>

      <input type="file" className="hidden" ref={proofInputRef} onChange={(e) => handleProofUpload(e, bookings.find(b=>b.status==='approved')?._id, 'advanceProof')} />
      <input type="file" className="hidden" ref={finalProofInputRef} onChange={(e) => handleProofUpload(e, bookings.find(b=>b.status==='advance_paid')?._id, 'finalProof')} />

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .animate-slideIn { animation: slideIn 0.4s ease-out; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default App;
