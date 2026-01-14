
import React, { useState, useEffect, useRef } from 'react';
import { Language, User, Translations, UserRole, Translation } from './types';
import { CATEGORIES as INITIAL_CATEGORIES, GLOBAL_CATEGORIES, BANNERS } from './constants';
import { LanguageSwitch } from './components/LanguageSwitch';

const API_BASE_URL = "https://biyahdaan.onrender.com/api"; 

const AdminDashboard = ({ adminSettings, setAdminSettings, updateBookingStatus, token }: { adminSettings: any, setAdminSettings: any, updateBookingStatus: any, token: string }) => {
    const [adminData, setAdminData] = useState<any>(null);
    const [viewProof, setViewProof] = useState<string | null>(null);

    const fetchAdminData = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/all-data`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setAdminData(await res.json());
        } catch (e) { console.error(e); }
    };

    useEffect(() => { if(token) fetchAdminData(); }, [token]);

    const saveSettings = async () => {
        await fetch(`${API_BASE_URL}/admin/settings`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
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
                                    await fetch(`${API_BASE_URL}/services/${s._id}`, {
                                        method:'DELETE',
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
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
  const [showSplash, setShowSplash] = useState(true);
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);

  const [lang, setLang] = useState<Language>(Language.EN);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>('');
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
    localStorage.removeItem('gramcart_token');
    setUser(null);
    setToken('');
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
    const savedToken = localStorage.getItem('gramcart_token');
    if (saved && savedToken) {
      try {
        const parsedUser = JSON.parse(saved);
        setUser(parsedUser);
        setToken(savedToken);
        if (parsedUser.role === 'vendor') fetchVendorProfile(parsedUser._id || parsedUser.id);
        const savedWish = localStorage.getItem(`wish_${parsedUser._id || parsedUser.id}`);
        if (savedWish) setWishlist(JSON.parse(savedWish));
      } catch (e) { 
        localStorage.removeItem('gramcart_user'); 
        localStorage.removeItem('gramcart_token');
      }
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
    if (!user || !token) return;
    const res = await fetch(`${API_BASE_URL}/my-bookings/${user.role}/${user._id || user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setBookings(await res.json());
  };

  const fetchMyServices = async () => {
    if (!user || user.role !== 'vendor' || !token) return;
    const vRes = await fetch(`${API_BASE_URL}/search`);
    const allV = await vRes.json();
    const v = allV.find((vend: any) => vend.userId === (user._id || user.id));
    if (v) {
        const res = await fetch(`${API_BASE_URL}/my-services/${v._id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setMyServices(await res.json());
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchBookings();
      if (user.role === UserRole.VENDOR) fetchMyServices();
    }
  }, [user, token, view]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for special Admin setup trigger
    if (authForm.identifier === "SUPERADMIN" && !isAdminMode) {
        setIsAdminMode(true);
        setAuthForm({...authForm, identifier: ''}); 
        return;
    }
    
    setLoading(true);

    if (isForgotMode) {
        try {
            const res = await fetch(`${API_BASE_URL}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: authForm.mobile, newPassword: authForm.password })
            });
            const result = await res.json();
            if (res.ok) {
                alert("Password Updated! Please Login.");
                setIsForgotMode(false);
            } else alert(result.error);
        } catch (e) {} finally { setLoading(false); }
        return;
    }

    if (isAdminMode) {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/settings`);
            const settings = await res.json();
            if (authForm.password === settings.password) {
                const loginRes = await fetch(`${API_BASE_URL}/login`, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ identifier: 'admin', password: settings.password }) 
                });
                const result = await loginRes.json();
                if (loginRes.ok) {
                    localStorage.setItem('gramcart_user', JSON.stringify(result.user));
                    localStorage.setItem('gramcart_token', result.token);
                    setUser(result.user);
                    setToken(result.token);
                    setAdminSettings(settings);
                    setView('home'); 
                    setLoading(false);
                    return;
                } else { alert("Admin Setup Required in Server"); setLoading(false); return; }
            } else { alert("Invalid Master Password"); setLoading(false); return; }
        } catch (err) { setLoading(false); return; }
    }

    const endpoint = authMode === 'login' ? '/login' : '/register';
    
    // Logic Fix: Ensure correct payload mapping for backend
    const payload = authMode === 'login' 
        ? { identifier: authForm.identifier, password: authForm.password } 
        : { 
            name: authForm.name, 
            email: authForm.email, 
            mobile: authForm.mobile, 
            password: authForm.password, 
            role: authForm.role, 
            location: userCoords 
          };
        
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (res.ok) {
        localStorage.setItem('gramcart_user', JSON.stringify(result.user));
        localStorage.setItem('gramcart_token', result.token);
        setUser(result.user);
        setToken(result.token);
        if (result.user.role === 'vendor') fetchVendorProfile(result.user._id || result.user.id);
        setView(result.user.role === 'vendor' ? 'vendor-dashboard' : 'home');
      } else alert(result.error);
    } catch (err) {
        alert("Server Error. Please try again later.");
    } finally { setLoading(false); }
  };

  const updateBookingStatus = async (id: string, update: any) => {
    try {
        const res = await fetch(`${API_BASE_URL}/bookings/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(update)
        });
        if (res.ok) fetchBookings();
    } catch (e) {}
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isService: boolean, isProof: boolean = false, isFinal: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        if (isProof) setBookingTarget({...bookingTarget, advanceProof: compressed});
        else if (isFinal) setBookingTarget({...bookingTarget, finalProof: compressed});
        else if (isService) setServiceForm({...serviceForm, images: [...serviceForm.images, compressed]});
      };
      reader.readAsDataURL(file);
    }
  };

  const submitBooking = async () => {
    if (!bookingForm.startDate || !bookingForm.endDate || !bookingForm.address || !bookingForm.pincode) return alert("Fill all details");
    setLoading(true);
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const payload = {
        customerId: user?._id || user?.id,
        vendorId: bookingTarget.vendorId,
        serviceId: bookingTarget._id,
        ...bookingForm,
        totalAmount: bookingTarget.rate,
        otp,
        status: 'pending'
    };
    try {
        const res = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert("Booking Request Sent Successfully!");
            setBookingTarget(null);
            setView('bookings');
        } else {
            const err = await res.json();
            alert(err.error || "Booking Failed");
        }
    } catch (e) {} finally { setLoading(false); }
  };

  const t = Translations[lang];

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-[#2874f0] flex flex-col items-center justify-center z-[1000] text-white">
        <h1 className="text-6xl font-black italic tracking-tighter mb-4 animate-bounce">GramCart</h1>
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        <p className="mt-6 font-black uppercase text-[10px] tracking-widest opacity-80">RURAL HYPER-LOCAL COMMERCE</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#2874f0] flex items-center justify-center p-6">
        <div className="bg-white w-full p-8 rounded-[2rem] shadow-2xl animate-slideUp">
          <div className="text-center mb-8"><h1 className="text-4xl font-black text-[#2874f0] italic tracking-tighter">GramCart</h1></div>
          <form onSubmit={handleAuth} className="space-y-4">
            {isForgotMode ? (
              <div className="animate-slideIn space-y-4">
                 <h2 className="text-center font-black text-xs uppercase text-gray-400 mb-2">Reset Your Password</h2>
                 <input placeholder="Registered Mobile Number" className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold" onChange={e => setAuthForm({...authForm, mobile: e.target.value})} required />
                 <input placeholder="Enter New Password" type="password" className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold" onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
                 <button className="w-full py-5 rounded-xl font-black text-white bg-[#2874f0] shadow-xl uppercase text-xs tracking-widest">{loading ? 'Processing...' : 'Reset Password'}</button>
                 <p className="text-center mt-4 text-[11px] font-black text-gray-400 cursor-pointer" onClick={() => setIsForgotMode(false)}>Back to Login</p>
              </div>
            ) : (
              <>
                {authMode === 'register' && !isAdminMode && (
                  <div className="space-y-4 animate-slideIn">
                    <input placeholder="Full Name" className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold" onChange={e => setAuthForm({...authForm, name: e.target.value})} required />
                    <input placeholder="Mobile Number" className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold" onChange={e => setAuthForm({...authForm, mobile: e.target.value})} required />
                  </div>
                )}
                {!isAdminMode && authMode === 'login' && (
                  <input placeholder="Email or Mobile" className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold" value={authForm.identifier} onChange={e => setAuthForm({...authForm, identifier: e.target.value})} required />
                )}
                {(authMode === 'login' || isAdminMode || authMode === 'register') && (
                  <div className="space-y-2">
                    <input placeholder={isAdminMode ? "System Master Password" : "Password"} type="password" className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold" onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
                    {!isAdminMode && authMode === 'login' && (
                      <p onClick={() => setIsForgotMode(true)} className="text-right text-[10px] font-black text-gray-400 cursor-pointer px-1">Forgot Password?</p>
                    )}
                  </div>
                )}
                {authMode === 'register' && !isAdminMode && (
                  <div className="flex gap-2 p-1 bg-gray-50 rounded-xl">
                    {['user', 'vendor'].map(r => (
                      <button key={r} type="button" onClick={() => setAuthForm({...authForm, role: r})} className={`flex-1 py-2 rounded-lg text-xs font-black ${authForm.role === r ? 'bg-[#2874f0] text-white shadow-lg' : 'text-gray-400'}`}>{r.toUpperCase()}</button>
                    ))}
                  </div>
                )}
                <button className="w-full py-5 rounded-xl font-black text-white bg-[#fb641b] shadow-xl uppercase text-xs tracking-widest">
                  {loading ? 'Please wait...' : (isAdminMode ? 'System Access' : (authMode === 'login' ? 'Login' : 'Sign Up'))}
                </button>
                {!isAdminMode && (
                  <p className="text-center mt-6 text-[11px] font-black text-[#2874f0] cursor-pointer" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                    {authMode === 'login' ? "New User? Register Now" : "Back to Login"}
                  </p>
                )}
              </>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#f1f3f6] pb-24 relative overflow-x-hidden">
      <header className="bg-[#2874f0] p-4 text-white sticky top-0 z-[100] shadow-md rounded-b-[1.5rem]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg"><i className="fas fa-shopping-cart text-[#2874f0] text-xl"></i></div>
            <h1 className="text-xl font-black italic tracking-tighter">GramCart</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitch current={lang} onChange={setLang} />
            <button onClick={handleLogout} className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md"><i className="fas fa-power-off text-white"></i></button>
          </div>
        </div>
        <div className="relative group">
          <input 
            className="w-full bg-white text-gray-800 p-4 rounded-2xl pl-12 text-sm font-bold shadow-inner outline-none transition-all group-focus-within:ring-4 group-focus-within:ring-white/20"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <button onClick={startVoiceSearch} className={`absolute right-4 top-1/2 -translate-y-1/2 ${isListening ? 'text-red-500 animate-pulse' : 'text-blue-500'}`}><i className="fas fa-microphone"></i></button>
        </div>
      </header>

      {isAdminMode ? (
        <AdminDashboard adminSettings={adminSettings} setAdminSettings={setAdminSettings} updateBookingStatus={updateBookingStatus} token={token} />
      ) : (
        <main className="p-4 space-y-6">
          {view === 'home' && (
            <>
              <div className="flex overflow-x-auto gap-3 no-scrollbar pb-2">
                {BANNERS.map(b => (
                  <div key={b.id} className={`${b.color} min-w-[300px] h-36 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl`}>
                    <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <p className="text-lg font-black relative z-10 leading-tight">{b.text}</p>
                    <button className="mt-4 bg-white text-gray-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Grab Now</button>
                  </div>
                ))}
              </div>

              <section>
                <div className="flex justify-between items-center mb-4"><h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">{t.categories}</h3><span className="text-[10px] font-bold text-blue-600 uppercase">View All</span></div>
                <div className="grid grid-cols-4 gap-4">
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => fetchData(cat.id)} className="flex flex-col items-center gap-2 group">
                      <div className={`${cat.color} w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl shadow-sm transition-all group-active:scale-90 group-hover:shadow-md border border-white`}>
                        <i className={`fas ${cat.icon}`}></i>
                      </div>
                      <span className="text-[10px] font-black text-gray-600 uppercase text-center line-clamp-1">{cat.name}</span>
                    </button>
                  ))}
                  <button onClick={() => setIsOtherCategory(true)} className="flex flex-col items-center gap-2 group">
                    <div className="bg-gray-100 w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl border border-white"><i className="fas fa-plus text-gray-400"></i></div>
                    <span className="text-[10px] font-black text-gray-600 uppercase">Others</span>
                  </button>
                </div>
              </section>

              <section>
                <div className="flex justify-between items-center mb-4"><h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">{t.popularServices}</h3><div className="flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-full"><i className="fas fa-location-arrow"></i> {t.nearby}</div></div>
                {loading ? (
                    <div className="space-y-4">{[1,2].map(n => <div key={n} className="bg-white h-48 rounded-[2rem] animate-pulse"></div>)}</div>
                ) : (
                  <div className="grid gap-6">
                    {filteredData.map(vendor => vendor.services?.map((s: any) => (
                        <div key={s._id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 group">
                          <div className="relative h-56">
                            <img src={s.images?.[0] || 'https://picsum.photos/400/300'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-[10px] font-black px-3 py-1 rounded-full shadow-lg">₹{s.rate} <span className="text-gray-400 font-bold uppercase">{s.unitType}</span></div>
                            <button onClick={() => {
                              const inWish = wishlist.includes(s._id);
                              const newWish = inWish ? wishlist.filter(id => id !== s._id) : [...wishlist, s._id];
                              setWishlist(newWish);
                              localStorage.setItem(`wish_${user?._id || user?.id}`, JSON.stringify(newWish));
                            }} className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-red-500">
                                <i className={`${wishlist.includes(s._id) ? 'fas' : 'far'} fa-heart`}></i>
                            </button>
                            <div className="absolute bottom-4 right-4 bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{s.category}</div>
                          </div>
                          <div className="p-6">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-black text-gray-900 text-lg leading-tight mb-1">{s.title}</h4>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest"><i className="fas fa-store mr-1 text-blue-500"></i> {vendor.businessName}</p>
                              </div>
                              <div className="bg-green-50 text-green-600 px-3 py-1 rounded-xl flex items-center gap-1 text-xs font-black">
                                <i className="fas fa-star"></i> {vendor.rating || 5}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-6">
                              <button onClick={() => setDetailTarget({...s, vendorName: vendor.businessName, vendorId: vendor._id})} className="flex-1 bg-gray-50 text-gray-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border border-gray-100">{t.viewDetails}</button>
                              <button onClick={() => setBookingTarget({...s, vendorId: vendor._id})} className="flex-[1.5] bg-[#fb641b] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-200 transition-all active:scale-95">{t.bookNow}</button>
                            </div>
                          </div>
                        </div>
                    )))}
                  </div>
                )}
              </section>
            </>
          )}

          {view === 'bookings' && (
            <div className="space-y-4 animate-slideIn">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm mb-6"><h3 className="font-black text-lg text-gray-900 leading-tight">Your Orders &<br/>Bookings</h3><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Track your current requests</p></div>
                {bookings.length === 0 && <div className="text-center py-20"><i className="fas fa-box-open text-4xl text-gray-200 mb-4"></i><p className="text-gray-400 font-black text-xs uppercase">No Bookings Yet</p></div>}
                {bookings.map(b => (
                    <div key={b._id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-2 h-full ${b.status === 'completed' ? 'bg-green-500' : b.status === 'cancelled' ? 'bg-red-400' : 'bg-blue-400'}`}></div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400"><i className={`fas ${GLOBAL_CATEGORIES[b.serviceId?.category]?.icon || 'fa-tag'}`}></i></div>
                                <div>
                                    <h4 className="font-black text-gray-900 text-sm">{b.serviceId?.title}</h4>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{b.vendorId?.businessName}</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${b.status === 'completed' ? 'bg-green-100 text-green-600' : b.status === 'cancelled' ? 'bg-red-50 text-red-400' : 'bg-blue-50 text-blue-600'}`}>{b.status}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-50 p-3 rounded-2xl"><p className="text-[8px] font-black text-gray-400 uppercase mb-1">Total Bill</p><p className="text-xs font-black">₹{b.totalAmount}</p></div>
                            <div className="bg-gray-50 p-3 rounded-2xl"><p className="text-[8px] font-black text-gray-400 uppercase mb-1">OTP Secret</p><p className="text-xs font-black text-blue-600">{b.otp || '****'}</p></div>
                        </div>
                        <div className="flex gap-2">
                            {b.status === 'pending' && <button onClick={() => updateBookingStatus(b._id, {status: 'cancelled'})} className="flex-1 py-3 rounded-xl border border-red-100 text-red-500 font-black text-[9px] uppercase tracking-widest">Cancel</button>}
                            {b.status === 'final_paid' && <button onClick={() => setOtpTarget({id: b._id, code: '', correctCode: b.otp})} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg">Release OTP to Vendor</button>}
                            {b.status === 'completed' && !b.review && <button onClick={() => setReviewTarget(b)} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest">Rate Service</button>}
                            <button onClick={() => {
                                const msg = `Hi ${b.vendorId?.businessName}, I am inquiring about my booking for ${b.serviceId?.title}. Booking ID: ${b._id}`;
                                window.open(`https://wa.me/${adminSettings.adminWhatsApp}?text=${encodeURIComponent(msg)}`);
                            }} className="flex-1 bg-[#25D366] text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"><i className="fab fa-whatsapp"></i> Support</button>
                        </div>
                    </div>
                ))}
            </div>
          )}

          {view === 'vendor-dashboard' && (
            <div className="space-y-6 animate-slideIn">
                <div className="bg-[#2874f0] p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                    <div className="absolute right-[-30px] bottom-[-30px] w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Vendor Payout Balance</p>
                    <h2 className="text-4xl font-black">₹{vendorProfile?.totalEarnings || 0}</h2>
                    <div className="flex items-center gap-2 mt-6 bg-white/20 w-fit px-4 py-2 rounded-2xl backdrop-blur-md">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Store Live & Active</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setView('my-services')} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center gap-3 transition-all active:scale-95 group">
                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors"><i className="fas fa-boxes-stacked"></i></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">My Inventory</span>
                    </button>
                    <button onClick={() => {
                        const upi = prompt("Enter your Payout UPI ID:", vendorProfile?.upiId);
                        if(upi) fetch(`${API_BASE_URL}/vendors/${vendorProfile._id}`, {
                            method: 'PATCH',
                            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                            body: JSON.stringify({upiId: upi})
                        }).then(r => r.json()).then(v => setVendorProfile(v));
                    }} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center gap-3 transition-all active:scale-95 group">
                        <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center text-xl group-hover:bg-orange-600 group-hover:text-white transition-colors"><i className="fas fa-wallet"></i></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Payout Config</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2"><h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Incoming Requests</h3><span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg shadow-blue-200">{bookings.length}</span></div>
                    {bookings.map(b => (
                        <div key={b._id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-black text-gray-900 leading-tight">{b.serviceId?.title}</h4>
                                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1">{b.customerId?.name} • {b.customerId?.mobile}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${b.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>{b.status}</span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl mb-6 space-y-2">
                                <div className="flex justify-between"><span className="text-[8px] font-black text-gray-400 uppercase">Booked For</span><span className="text-[9px] font-black">{new Date(b.startDate).toLocaleDateString()}</span></div>
                                <div className="flex justify-between"><span className="text-[8px] font-black text-gray-400 uppercase">Location</span><span className="text-[9px] font-black truncate w-32 text-right">{b.address}</span></div>
                            </div>
                            <div className="flex gap-2">
                                {b.status === 'pending' && (
                                    <>
                                        <button onClick={() => updateBookingStatus(b._id, {status: 'approved'})} className="flex-1 bg-green-600 text-white py-4 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-green-100">Accept</button>
                                        <button onClick={() => updateBookingStatus(b._id, {status: 'cancelled'})} className="flex-1 bg-white border border-red-100 text-red-500 py-4 rounded-xl font-black text-[9px] uppercase tracking-widest">Decline</button>
                                    </>
                                )}
                                {b.status === 'approved' && <button onClick={() => setBookingTarget(b)} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg">Work Completed</button>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {view === 'my-services' && (
            <div className="space-y-6 animate-slideIn">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[4rem]"></div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-black text-gray-900 leading-tight">Publish New<br/>Inventory</h3>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Add tents, DJ equipment or more</p>
                        <button onClick={() => {
                            setServiceForm({title:'', category:'tent', description:'', rate:'', unitType:'Per Day', inventoryList:[], images:[], contactNumber: user?.mobile || '', _id:'', upiId:'', variant:'Simple', blockedDates:[]});
                            setPublishStatus('editing');
                        }} className="mt-6 bg-[#2874f0] text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all">Add New Item</button>
                    </div>
                </div>

                <div className="grid gap-4">
                    {myServices.map(s => (
                        <div key={s._id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-gray-100 flex gap-4 items-center group">
                            <img src={s.images?.[0] || 'https://picsum.photos/100'} className="w-20 h-20 rounded-2xl object-cover shadow-sm group-hover:scale-110 transition-transform" />
                            <div className="flex-1">
                                <h4 className="font-black text-gray-900 text-sm">{s.title}</h4>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">{s.category} • {s.variant}</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-blue-600 font-black text-xs">₹{s.rate}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => {setServiceForm(s); setPublishStatus('editing');}} className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-500 hover:bg-blue-600 hover:text-white transition-all"><i className="fas fa-edit text-[10px]"></i></button>
                                        <button onClick={async () => {
                                            if(window.confirm("Remove this item?")) {
                                                await fetch(`${API_BASE_URL}/services/${s._id}`, {method:'DELETE', headers:{'Authorization':`Bearer ${token}`}});
                                                fetchMyServices();
                                            }
                                        }} className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all"><i className="fas fa-trash-alt text-[10px]"></i></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {view === 'wishlist' && (
              <div className="space-y-4 animate-slideIn">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm text-center">
                    <h3 className="text-xl font-black text-gray-900 leading-tight">My Wishlist</h3>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Saved items for later</p>
                  </div>
                  {wishlist.length === 0 && <div className="text-center py-20 text-gray-300"><i className="far fa-heart text-4xl mb-4 opacity-20"></i><p className="text-[10px] font-black uppercase tracking-widest">Wishlist is Empty</p></div>}
                  {data.filter(v => v.services?.some((s:any) => wishlist.includes(s._id))).map(vendor => vendor.services?.filter((s:any) => wishlist.includes(s._id)).map((s:any) => (
                      <div key={s._id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-gray-100 flex gap-4 items-center group">
                          <img src={s.images?.[0] || 'https://picsum.photos/100'} className="w-20 h-20 rounded-2xl object-cover" />
                          <div className="flex-1">
                              <h4 className="font-black text-gray-900 text-sm">{s.title}</h4>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{vendor.businessName}</p>
                              <div className="flex justify-between items-center mt-2">
                                  <span className="text-blue-600 font-black text-xs">₹{s.rate}</span>
                                  <button onClick={() => setBookingTarget({...s, vendorId: vendor._id})} className="bg-[#fb641b] text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Book Now</button>
                              </div>
                          </div>
                      </div>
                  )))}
              </div>
          )}
        </main>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-gray-100 p-4 flex justify-around items-center z-[200] max-w-md mx-auto rounded-t-[2.5rem] shadow-2xl">
        {[
          { id: 'home', icon: 'fa-home', label: 'Explore' },
          { id: 'bookings', icon: 'fa-calendar-check', label: 'Bookings' },
          { id: 'wishlist', icon: 'fa-heart', label: 'Saved' },
          { id: user?.role === 'vendor' ? 'vendor-dashboard' : 'home', icon: user?.role === 'vendor' ? 'fa-store' : 'fa-user', label: user?.role === 'vendor' ? 'Dashboard' : 'Account' }
        ].map(item => (
          <button 
            key={item.id} 
            onClick={() => setView(item.id as any)} 
            className={`flex flex-col items-center gap-1 transition-all ${view === item.id ? 'text-[#2874f0]' : 'text-gray-400'}`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${view === item.id ? 'bg-blue-50 shadow-inner' : ''}`}>
              <i className={`fas ${item.icon} text-lg`}></i>
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* MODALS SECTION */}
      {publishStatus === 'editing' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[500] flex items-end justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 animate-slideUp max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-900 leading-tight">Inventory<br/>Details</h3>
                    <button onClick={() => setPublishStatus('')} className="bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center text-gray-400"><i className="fas fa-times"></i></button>
                </div>
                <div className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Service Title</label>
                        <input className="w-full bg-gray-50 p-5 rounded-[1.5rem] font-bold text-sm outline-none border border-transparent focus:border-blue-100" placeholder="e.g. Premium Wedding Pandal" value={serviceForm.title} onChange={e => setServiceForm({...serviceForm, title: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Category</label>
                            <select className="w-full bg-gray-50 p-5 rounded-[1.5rem] font-bold text-sm outline-none border border-transparent focus:border-blue-100 appearance-none" value={serviceForm.category} onChange={e => setServiceForm({...serviceForm, category: e.target.value})}>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Quality Level</label>
                            <select className="w-full bg-gray-50 p-5 rounded-[1.5rem] font-bold text-sm outline-none border border-transparent focus:border-blue-100 appearance-none" value={serviceForm.variant} onChange={e => setServiceForm({...serviceForm, variant: e.target.value as any})}>
                                <option value="Simple">Basic</option>
                                <option value="Standard">Standard</option>
                                <option value="Premium">Premium</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Rate (₹)</label>
                            <input type="number" className="w-full bg-gray-50 p-5 rounded-[1.5rem] font-bold text-sm outline-none" placeholder="0.00" value={serviceForm.rate} onChange={e => setServiceForm({...serviceForm, rate: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Unit</label>
                            <select className="w-full bg-gray-50 p-5 rounded-[1.5rem] font-bold text-sm outline-none" value={serviceForm.unitType} onChange={e => setServiceForm({...serviceForm, unitType: e.target.value})}>
                                <option>Per Day</option>
                                <option>Per Function</option>
                                <option>Per Item</option>
                                <option>Package</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Inventory Checklist</label>
                        <div className="flex gap-2">
                            <input className="flex-1 bg-gray-50 p-4 rounded-xl text-xs font-bold outline-none" placeholder="Item Name" value={customItem.name} onChange={e => setCustomItem({...customItem, name: e.target.value})} />
                            <input className="w-20 bg-gray-50 p-4 rounded-xl text-xs font-bold outline-none" placeholder="Qty" value={customItem.qty} onChange={e => setCustomItem({...customItem, qty: e.target.value})} />
                            <button onClick={() => { if(customItem.name) { setServiceForm({...serviceForm, inventoryList: [...serviceForm.inventoryList, customItem]}); setCustomItem({name:'', qty:''}); } }} className="bg-blue-600 text-white w-12 rounded-xl flex items-center justify-center shadow-lg"><i className="fas fa-plus"></i></button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {serviceForm.inventoryList.map((item, idx) => (
                                <div key={idx} className="bg-blue-50 text-blue-600 px-3 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-2">
                                    {item.name} ({item.qty}) <i className="fas fa-times-circle cursor-pointer" onClick={() => setServiceForm({...serviceForm, inventoryList: serviceForm.inventoryList.filter((_,i) => i !== idx)})}></i>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Service Photos</label>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                            <button onClick={() => fileInputRef.current?.click()} className="min-w-[80px] h-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-300 hover:text-blue-500 hover:border-blue-300 transition-colors"><i className="fas fa-camera text-xl"></i></button>
                            {serviceForm.images.map((img, idx) => (
                                <div key={idx} className="relative min-w-[80px] h-20">
                                    <img src={img} className="w-full h-full object-cover rounded-2xl shadow-sm" />
                                    <button onClick={() => setServiceForm({...serviceForm, images: serviceForm.images.filter((_,i) => i !== idx)})} className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[8px]"><i className="fas fa-times"></i></button>
                                </div>
                            ))}
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => handleFileChange(e, true)} />
                    </div>

                    <button disabled={loading} onClick={async () => {
                        setLoading(true);
                        const endpoint = serviceForm._id ? `${API_BASE_URL}/services/${serviceForm._id}` : `${API_BASE_URL}/services`;
                        const method = serviceForm._id ? 'PUT' : 'POST';
                        try {
                            const res = await fetch(endpoint, {
                                method,
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({...serviceForm, vendorId: vendorProfile._id})
                            });
                            if (res.ok) {
                                alert("Inventory Updated Successfully!");
                                setPublishStatus('');
                                fetchMyServices();
                            }
                        } catch (e) {} finally { setLoading(false); }
                    }} className="w-full bg-[#fb641b] text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-100 active:scale-95 transition-all">
                        {loading ? 'Publishing...' : 'Confirm & Publish'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {detailTarget && (
        <div className="fixed inset-0 bg-white z-[600] overflow-y-auto no-scrollbar animate-slideIn">
            <div className="relative h-[45vh]">
                <img src={detailTarget.images?.[activeImageIdx] || 'https://picsum.photos/600/400'} className="w-full h-full object-cover" />
                <button onClick={() => setDetailTarget(null)} className="absolute top-6 left-6 w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-xl"><i className="fas fa-arrow-left"></i></button>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                    {detailTarget.images?.map((_:any, i:number) => (
                        <div key={i} onClick={() => setActiveImageIdx(i)} className={`h-1.5 rounded-full transition-all cursor-pointer ${activeImageIdx === i ? 'w-8 bg-blue-600' : 'w-2 bg-white/50'}`}></div>
                    ))}
                </div>
            </div>
            <div className="p-8 space-y-8 pb-32 -mt-10 bg-white rounded-t-[3rem] relative z-10 shadow-2xl">
                <div className="flex justify-between items-start">
                    <div>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full mb-3 inline-block">{detailTarget.category}</span>
                        <h2 className="text-3xl font-black text-gray-900 leading-tight mb-2">{detailTarget.title}</h2>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><i className="fas fa-store text-blue-500"></i> {detailTarget.vendorName}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-blue-600">₹{detailTarget.rate}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase">{detailTarget.unitType}</p>
                    </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-[2rem] space-y-4">
                    <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2"><i className="fas fa-list-check text-blue-600"></i> What's Included?</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {detailTarget.inventoryList?.length > 0 ? detailTarget.inventoryList.map((item:any, idx:number) => (
                            <div key={idx} className="bg-white p-3 rounded-xl flex items-center gap-3 shadow-sm">
                                <i className="fas fa-check-circle text-green-500 text-xs"></i>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-700 uppercase leading-none">{item.name}</span>
                                    <span className="text-[8px] font-bold text-gray-400 mt-1">{item.qty} units</span>
                                </div>
                            </div>
                        )) : (GLOBAL_CATEGORIES[detailTarget.category]?.items?.map((item:string, idx:number) => (
                            <div key={idx} className="bg-white p-3 rounded-xl flex items-center gap-3 shadow-sm">
                                <i className="fas fa-check-circle text-green-500 text-xs"></i>
                                <span className="text-[10px] font-black text-gray-700 uppercase">{item}</span>
                            </div>
                        )))}
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Service Description</h4>
                    <p className="text-gray-500 text-sm leading-relaxed font-medium">{detailTarget.description || "This high-quality service is provided by our verified vendor with years of experience in rural event management. We guarantee timely setup and clean equipment for your auspicious occasions."}</p>
                </div>

                <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-gray-100 max-w-md mx-auto z-[700]">
                    <button onClick={() => { setBookingTarget(detailTarget); setDetailTarget(null); }} className="w-full bg-[#fb641b] text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-orange-200 active:scale-95 transition-all">Instant Book Now</button>
                </div>
            </div>
        </div>
      )}

      {bookingTarget && !bookingTarget.status && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[800] flex items-end justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 animate-slideUp max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 leading-tight">Review Your<br/>Booking</h3>
                        <p className="text-[10px] text-gray-400 font-black uppercase mt-1">Check dates & venue</p>
                    </div>
                    <button onClick={() => setBookingTarget(null)} className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center text-gray-400"><i className="fas fa-times"></i></button>
                </div>
                <div className="space-y-6">
                    <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                        <div className="flex justify-between mb-4 pb-4 border-b border-blue-100">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Service Price</span>
                            <span className="text-lg font-black text-blue-600">₹{bookingTarget.rate}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Platform Fee</span>
                            <span className="text-[11px] font-black text-green-600">₹0.00 (FREE)</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Event Date</label>
                            <input type="date" className="w-full bg-gray-50 p-4 rounded-xl font-bold text-xs outline-none" value={bookingForm.startDate} onChange={e => setBookingForm({...bookingForm, startDate: e.target.value, endDate: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Pin Code</label>
                            <input type="number" className="w-full bg-gray-50 p-4 rounded-xl font-bold text-xs outline-none" placeholder="400001" value={bookingForm.pincode} onChange={e => setBookingForm({...bookingForm, pincode: e.target.value})} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Full Venue Address</label>
                        <textarea className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-xs outline-none min-h-[80px]" placeholder="Village, Landmark, Street details..." value={bookingForm.address} onChange={e => setBookingForm({...bookingForm, address: e.target.value})} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Alt. Contact Number</label>
                        <input className="w-full bg-gray-50 p-4 rounded-xl font-bold text-xs outline-none" placeholder="9876XXXXXX" value={bookingForm.altMobile} onChange={e => setBookingForm({...bookingForm, altMobile: e.target.value})} />
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
                        <p className="text-[9px] font-black text-yellow-700 leading-relaxed"><i className="fas fa-info-circle mr-1"></i> Note: Payments are processed via cash/UPI directly at the time of service delivery. No advance needed on platform.</p>
                    </div>

                    <button onClick={submitBooking} className="w-full bg-[#fb641b] text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-100">Confirm Booking Request</button>
                </div>
            </div>
        </div>
      )}

      {bookingTarget && bookingTarget.status === 'approved' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[900] flex items-end justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 animate-slideUp">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-900 leading-tight">Job Complete<br/>Verification</h3>
                    <button onClick={() => setBookingTarget(null)} className="text-gray-400"><i className="fas fa-times"></i></button>
                </div>
                <div className="space-y-6">
                    <p className="text-[11px] font-bold text-gray-400 leading-relaxed uppercase tracking-widest">Upload photo of the setup or work done to initiate final payment request from customer.</p>
                    <div className="h-48 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3 relative overflow-hidden group">
                        {bookingTarget.finalProof ? (
                            <img src={bookingTarget.finalProof} className="w-full h-full object-cover" />
                        ) : (
                            <>
                                <i className="fas fa-camera text-3xl text-gray-200 group-hover:text-blue-400 transition-colors"></i>
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Click to Capture Setup</span>
                            </>
                        )}
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleFileChange(e, false, false, true)} />
                    </div>
                    <button onClick={() => updateBookingStatus(bookingTarget._id, {status: 'awaiting_final_verification', finalProof: bookingTarget.finalProof})} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100">Submit for Verification</button>
                </div>
            </div>
        </div>
      )}

      {otpTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xl z-[1000] flex items-center justify-center p-8">
            <div className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 text-center animate-slideUp">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-6"><i className="fas fa-shield-halved"></i></div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Release OTP</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Enter OTP provided by customer to complete this order</p>
                <div className="flex justify-center gap-2 mb-8">
                    {[0,1,2,3].map(i => (
                        <input key={i} maxLength={1} value={otpTarget.code[i] || ''} onChange={e => {
                            const newCode = otpTarget.code.split('');
                            newCode[i] = e.target.value;
                            setOtpTarget({...otpTarget, code: newCode.join('')});
                        }} className="w-12 h-16 bg-gray-50 rounded-xl text-center font-black text-xl border-2 border-transparent focus:border-blue-400 outline-none" />
                    ))}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setOtpTarget(null)} className="flex-1 py-4 text-gray-400 font-black text-[10px] uppercase">Cancel</button>
                    <button onClick={() => {
                        if(otpTarget.code === otpTarget.correctCode) {
                            updateBookingStatus(otpTarget.id, {status: 'completed'});
                            setOtpTarget(null);
                            alert("Booking Completed Successfully!");
                        } else alert("Invalid OTP Secret");
                    }} className="flex-1 bg-green-600 text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-lg">Verify</button>
                </div>
            </div>
        </div>
      )}

      {reviewTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[1000] flex items-end justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 animate-slideUp shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-gray-900 leading-tight">Rate the<br/>Experience</h3>
                      <button onClick={() => setReviewTarget(null)} className="text-gray-400"><i className="fas fa-times"></i></button>
                  </div>
                  <div className="space-y-6">
                      <div className="flex justify-center gap-4">
                          {[1,2,3,4,5].map(star => (
                              <i key={star} onClick={() => setReviewForm({...reviewForm, rating: star})} className={`fas fa-star text-3xl cursor-pointer transition-all ${reviewForm.rating >= star ? 'text-yellow-400 scale-110' : 'text-gray-200'}`}></i>
                          ))}
                      </div>
                      <textarea className="w-full bg-gray-50 p-5 rounded-3xl text-sm font-bold outline-none border border-transparent focus:border-blue-100 min-h-[120px]" placeholder="How was the setup quality, behavior, and timing?" onChange={e => setReviewForm({...reviewForm, comment: e.target.value})} />
                      <button onClick={async () => {
                          await updateBookingStatus(reviewTarget._id, {review: reviewForm});
                          setReviewTarget(null);
                          alert("Thank you for your feedback!");
                      }} className="w-full bg-[#2874f0] text-white py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-100 active:scale-95 transition-all">Submit Review</button>
                  </div>
              </div>
          </div>
      )}

      {isOtherCategory && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[1000] flex items-center justify-center p-8">
              <div className="bg-white w-full max-w-xs rounded-[3rem] p-8 animate-slideUp shadow-2xl">
                  <h3 className="text-xl font-black text-gray-900 leading-tight mb-4 text-center">Missing Something?</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-6 leading-relaxed">Tell us what service you are looking for, and we will find local vendors for you!</p>
                  <input className="w-full bg-gray-50 p-5 rounded-2xl font-bold text-xs outline-none mb-4" placeholder="e.g. Band, Firecrackers..." />
                  <button onClick={() => { setIsOtherCategory(false); alert("Request received! Our team will contact local vendors soon."); }} className="w-full bg-[#2874f0] text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Submit Request</button>
                  <button onClick={() => setIsOtherCategory(false)} className="w-full mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Maybe Later</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
