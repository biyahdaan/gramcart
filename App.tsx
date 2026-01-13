
import React, { useState, useEffect } from 'react';
import { Language, User, Translations, UserRole, Translation } from './types';
import { CATEGORIES } from './constants';
import { LanguageSwitch } from './components/LanguageSwitch';

const API_BASE_URL = "https://biyahdaan.onrender.com/api"; 

// Category specific presets
const PRESETS: Record<string, string[]> = {
  dj: ['2 Bass', '4 Tops', 'Sharpy Lights', 'Smoke Machine', 'LED Wall', 'Mixer Console', 'JBL Speakers'],
  tent: ['200 Chairs', 'Waterproof Pandal', 'VIP Stage', 'Red Carpet', 'Sofa Set', 'Entrance Gate'],
  catering: ['Breakfast', 'Lunch', 'Full Buffet', 'Chinese Stall', 'South Indian Stall', 'Waiters (x5)'],
  electric: ['Generator', 'Halogen Lights', 'Decorative Serial Lights', 'Tower Lights']
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(Language.EN);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [view, setView] = useState<'home' | 'vendor-dashboard' | 'bookings' | 'my-services'>('home');
  const [data, setData] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [myServices, setMyServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modals/Forms
  const [bookingTarget, setBookingTarget] = useState<any>(null);
  const [authForm, setAuthForm] = useState({ identifier: '', email: '', mobile: '', password: '', name: '', role: 'user' });
  const [serviceForm, setServiceForm] = useState({
    title: '', category: 'tent', rate: '', unitType: 'Per Day', duration: '1 Day', itemsIncluded: [] as string[], contactNumber: '', _id: '', customItem: ''
  });
  const [bookingForm, setBookingForm] = useState({ startDate: '', endDate: '', address: '' });

  const t = Translations[lang];

  useEffect(() => {
    const saved = localStorage.getItem('gramcart_user');
    if (saved) {
      const parsedUser = JSON.parse(saved);
      setUser(parsedUser);
      if (parsedUser.role === 'vendor') setView('vendor-dashboard');
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchBookings();
      if (user.role === 'vendor') fetchMyServices();
    }
  }, [user, view]);

  const fetchData = async (cat: string = '') => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/search?cat=${cat}`);
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchBookings = async () => {
    if (!user) return;
    try {
      const id = user._id || user.id;
      const res = await fetch(`${API_BASE_URL}/my-bookings/${user.role}/${id}`);
      if (res.ok) setBookings(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchMyServices = async () => {
    if (!user || user.role !== 'vendor') return;
    try {
      const vendorsRes = await fetch(`${API_BASE_URL}/search`);
      const allVendors = await vendorsRes.json();
      const currentVendor = allVendors.find((v: any) => v.userId === (user._id || user.id));
      if (currentVendor) {
        const res = await fetch(`${API_BASE_URL}/my-services/${currentVendor._id}`);
        if (res.ok) setMyServices(await res.json());
      }
    } catch (e) { console.error(e); }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = authMode === 'login' ? '/login' : '/register';
    const payload = authMode === 'login' 
      ? { identifier: authForm.identifier, password: authForm.password } 
      : { name: authForm.name, email: authForm.email, mobile: authForm.mobile, password: authForm.password, role: authForm.role };
    
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok) {
        localStorage.setItem('gramcart_user', JSON.stringify(result.user));
        setUser(result.user);
        setView(result.user.role === 'vendor' ? 'vendor-dashboard' : 'home');
      } else { alert(result.error); }
    } catch (err) { alert("Server Error"); } finally { setLoading(false); }
  };

  const togglePresetItem = (item: string) => {
    const exists = serviceForm.itemsIncluded.includes(item);
    if (exists) {
      setServiceForm({ ...serviceForm, itemsIncluded: serviceForm.itemsIncluded.filter(i => i !== item) });
    } else {
      setServiceForm({ ...serviceForm, itemsIncluded: [...serviceForm.itemsIncluded, item] });
    }
  };

  const addCustomItem = () => {
    if (serviceForm.customItem.trim()) {
      setServiceForm({
        ...serviceForm,
        itemsIncluded: [...serviceForm.itemsIncluded, serviceForm.customItem.trim()],
        customItem: ''
      });
    }
  };

  const handleAddOrUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const vendorsRes = await fetch(`${API_BASE_URL}/search`);
      const allVendors = await vendorsRes.json();
      const currentVendor = allVendors.find((v: any) => v.userId === (user?._id || user?.id));
      
      const method = serviceForm._id ? 'PUT' : 'POST';
      const endpoint = serviceForm._id ? `/services/${serviceForm._id}` : '/services';

      const payload = {
        vendorId: currentVendor?._id,
        category: serviceForm.category,
        title: serviceForm.title,
        unitType: serviceForm.unitType,
        rate: Number(serviceForm.rate),
        contactNumber: serviceForm.contactNumber,
        itemsIncluded: serviceForm.itemsIncluded,
        duration: serviceForm.duration
      };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert(serviceForm._id ? "Service Updated!" : "Service Saved to Database!");
        setServiceForm({ title: '', category: 'tent', rate: '', unitType: 'Per Day', duration: '1 Day', itemsIncluded: [], contactNumber: '', _id: '', customItem: '' });
        await fetchMyServices();
        await fetchData();
        setView('my-services');
      } else {
        const err = await res.json();
        alert("Failed to save: " + err.error);
      }
    } catch (e) { alert("Error connecting to server"); } finally { setLoading(false); }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const diff = new Date(bookingForm.endDate).getTime() - new Date(bookingForm.startDate).getTime();
      const days = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      const total = bookingTarget.rate * days;

      const res = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user._id || user.id,
          vendorId: bookingTarget.vendorId,
          serviceId: bookingTarget._id,
          ...bookingForm,
          totalAmount: total
        })
      });
      if (res.ok) {
        alert("Booking Requested!");
        setBookingTarget(null);
        setView('bookings');
      }
    } catch (e) { alert("Booking failed"); } finally { setLoading(false); }
  };

  const editService = (s: any) => {
    setServiceForm({ ...s, itemsIncluded: s.itemsIncluded || [], customItem: '' });
    setView('vendor-dashboard');
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-blue-600 flex items-center justify-center p-6">
        <div className="bg-white w-full p-8 rounded-[2.5rem] shadow-2xl">
          <h1 className="text-4xl font-black text-blue-600 italic text-center mb-6">GramCart</h1>
          <form onSubmit={handleAuth} className="space-y-3">
            {authMode === 'register' ? (
              <>
                <input placeholder="Name" className="w-full bg-gray-50 p-4 rounded-2xl outline-none border" onChange={e => setAuthForm({...authForm, name: e.target.value})} required />
                <input placeholder="Mobile" className="w-full bg-gray-50 p-4 rounded-2xl outline-none border" onChange={e => setAuthForm({...authForm, mobile: e.target.value})} required />
                <input placeholder="Email (Optional)" className="w-full bg-gray-50 p-4 rounded-2xl outline-none border" onChange={e => setAuthForm({...authForm, email: e.target.value})} />
              </>
            ) : (
              <input placeholder="Email or Mobile" className="w-full bg-gray-50 p-4 rounded-2xl outline-none border" onChange={e => setAuthForm({...authForm, identifier: e.target.value})} required />
            )}
            <input placeholder="Password" type="password" className="w-full bg-gray-50 p-4 rounded-2xl outline-none border" onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
            {authMode === 'register' && (
              <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl">
                {['user', 'vendor'].map(r => (
                  <button key={r} type="button" onClick={() => setAuthForm({...authForm, role: r})} className={`flex-1 py-2 rounded-xl text-[10px] font-bold ${authForm.role === r ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>{r.toUpperCase()}</button>
                ))}
              </div>
            )}
            <button className="w-full py-4 rounded-2xl font-black text-white bg-blue-600 shadow-xl">{authMode === 'login' ? 'LOGIN' : 'SIGN UP'}</button>
          </form>
          <p className="text-center mt-4 text-[10px] font-black text-gray-400 cursor-pointer" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
            {authMode === 'login' ? "CREATE ACCOUNT" : "ALREADY HAVE AN ACCOUNT?"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-24 font-sans relative">
      <header className={`p-6 rounded-b-[2.5rem] shadow-xl text-white ${view === 'home' || view === 'bookings' ? 'bg-blue-600' : 'bg-purple-600'}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black italic">GramCart</h1>
          <LanguageSwitch current={lang} onChange={setLang} />
        </div>
        {view === 'home' && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
            <button onClick={() => fetchData('')} className="bg-white/20 px-4 py-2 rounded-full whitespace-nowrap text-[10px] font-bold">ALL</button>
            {CATEGORIES.map(c => <button key={c.id} onClick={() => fetchData(c.id)} className="bg-white/20 px-4 py-2 rounded-full whitespace-nowrap text-[10px] font-bold uppercase">{c.name}</button>)}
          </div>
        )}
      </header>

      <main className="p-6">
        {view === 'home' && (
          <div className="space-y-4">
            {data.map(vendor => (
              <div key={vendor._id} className="bg-white rounded-3xl p-5 shadow-sm border animate-fadeIn">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-black text-gray-800 text-lg">{vendor.businessName}</h3>
                  {vendor.isVerified && <i className="fas fa-check-circle text-blue-500"></i>}
                </div>
                <div className="space-y-3">
                  {vendor.services?.map((s: any) => (
                    <div key={s._id} className="bg-gray-50 p-4 rounded-2xl border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs font-black text-gray-700">{s.title}</p>
                          <p className="text-[10px] text-blue-600 font-bold"><i className="fas fa-phone mr-1"></i>{s.contactNumber}</p>
                        </div>
                        <p className="text-sm font-black text-blue-600">₹{s.rate}/<span className="text-[10px]">{s.unitType}</span></p>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {s.itemsIncluded?.map((item: string, i: number) => (
                          <span key={i} className="text-[9px] bg-white px-2 py-1 rounded border text-gray-500 font-bold">{item}</span>
                        ))}
                      </div>
                      <button onClick={() => setBookingTarget(s)} className="w-full bg-blue-600 text-white py-2 rounded-xl text-[10px] font-black uppercase shadow-md active:scale-95 transition-all">Book Now</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'vendor-dashboard' && (
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border">
            <h3 className="text-xs font-black text-purple-600 uppercase mb-4 tracking-widest">{serviceForm._id ? 'Update Service' : 'Add New Service'}</h3>
            <form onSubmit={handleAddOrUpdateService} className="space-y-4">
              <input placeholder="Service Title (e.g. Wedding DJ)" className="w-full bg-gray-50 p-4 rounded-2xl outline-none border" value={serviceForm.title} onChange={e => setServiceForm({...serviceForm, title: e.target.value})} required />
              <div className="grid grid-cols-2 gap-3">
                <select className="bg-gray-50 p-4 rounded-2xl outline-none border text-[10px] font-bold" value={serviceForm.category} onChange={e => setServiceForm({...serviceForm, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="bg-gray-50 p-4 rounded-2xl outline-none border text-[10px] font-bold" value={serviceForm.unitType} onChange={e => setServiceForm({...serviceForm, unitType: e.target.value})}>
                  <option>Per Day</option><option>Per Piece</option><option>Per Sq Ft</option><option>Per Meter</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Rate (Rs)" type="number" className="bg-gray-50 p-4 rounded-2xl outline-none border" value={serviceForm.rate} onChange={e => setServiceForm({...serviceForm, rate: e.target.value})} required />
                <input placeholder="Your Mobile" type="tel" className="bg-gray-50 p-4 rounded-2xl outline-none border" value={serviceForm.contactNumber} onChange={e => setServiceForm({...serviceForm, contactNumber: e.target.value})} required />
              </div>

              {/* DYNAMIC ITEM SELECTION */}
              <div className="bg-purple-50 p-4 rounded-2xl">
                <label className="text-[10px] font-black text-purple-600 uppercase mb-2 block">Quick Select Items</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(PRESETS[serviceForm.category] || []).map(item => (
                    <button key={item} type="button" onClick={() => togglePresetItem(item)} 
                      className={`px-3 py-1 rounded-lg text-[9px] font-bold border transition-all ${serviceForm.itemsIncluded.includes(item) ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-400 border-gray-100'}`}>
                      {item}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input placeholder="Other / Manual Entry" className="flex-1 bg-white p-2 rounded-xl text-[10px] outline-none border" value={serviceForm.customItem} onChange={e => setServiceForm({...serviceForm, customItem: e.target.value})} />
                  <button type="button" onClick={addCustomItem} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-[10px] font-black">ADD</button>
                </div>
              </div>

              {/* CURRENT LIST */}
              {serviceForm.itemsIncluded.length > 0 && (
                <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-xl border">
                  {serviceForm.itemsIncluded.map(i => (
                    <span key={i} className="bg-white px-2 py-1 rounded text-[8px] font-bold border flex items-center gap-1">
                      {i} <i className="fas fa-times text-red-400 cursor-pointer" onClick={() => togglePresetItem(i)}></i>
                    </span>
                  ))}
                </div>
              )}

              <button className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-[10px] shadow-lg active:scale-95 transition-all">
                {serviceForm._id ? 'UPDATE SERVICE' : 'PUBLISH TO MARKETPLACE'}
              </button>
            </form>
          </div>
        )}

        {view === 'my-services' && (
          <div className="space-y-4">
            <h2 className="font-black text-gray-800 text-lg mb-4 flex items-center gap-2"><i className="fas fa-boxes"></i> My Inventory</h2>
            {myServices.map(s => (
              <div key={s._id} className="bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center animate-fadeIn">
                <div>
                  <p className="font-black text-gray-700 text-xs">{s.title}</p>
                  <p className="text-[10px] text-purple-600 font-bold uppercase">{s.category}</p>
                  <p className="text-[10px] text-gray-400 font-bold">₹{s.rate} / {s.unitType}</p>
                </div>
                <button onClick={() => editService(s)} className="bg-purple-50 text-purple-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-sm">Edit</button>
              </div>
            ))}
          </div>
        )}

        {view === 'bookings' && (
          <div className="space-y-4">
            <h2 className="font-black text-gray-800 text-lg mb-4">{user.role === 'vendor' ? 'Orders Received' : 'My Bookings'}</h2>
            {bookings.length === 0 && <p className="text-center text-gray-400 text-xs py-10">No bookings yet.</p>}
            {bookings.map(b => (
              <div key={b._id} className="bg-white p-5 rounded-2xl shadow-sm border border-l-4 border-l-blue-600">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase">{b.serviceId?.title || 'Service'}</p>
                    <p className="text-xs font-bold text-gray-700 mt-1">
                      {user.role === 'vendor' ? `Client: ${b.customerId?.name}` : `Vendor: ${b.vendorId?.businessName}`}
                    </p>
                  </div>
                  <span className="bg-yellow-50 text-yellow-600 px-2 py-1 rounded text-[8px] font-black uppercase">{b.status}</span>
                </div>
                <div className="text-[10px] text-gray-500 space-y-1">
                  <p><i className="fas fa-calendar mr-2"></i>{new Date(b.startDate).toLocaleDateString()} to {new Date(b.endDate).toLocaleDateString()}</p>
                  <p><i className="fas fa-map-marker-alt mr-2"></i>{b.address}</p>
                  {user.role === 'vendor' && <p><i className="fas fa-phone mr-2"></i>{b.customerId?.mobile}</p>}
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <p className="text-xs font-black text-gray-800">Total: ₹{b.totalAmount}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Booking Modal */}
      {bookingTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 animate-slideUp">
            <div className="flex justify-between mb-6">
              <h3 className="font-black text-xl text-gray-800">Book {bookingTarget.title}</h3>
              <button onClick={() => setBookingTarget(null)} className="text-gray-400"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleBooking} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Start Date</label>
                  <input type="date" className="w-full bg-gray-50 p-4 rounded-2xl border outline-none" onChange={e => setBookingForm({...bookingForm, startDate: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">End Date</label>
                  <input type="date" className="w-full bg-gray-50 p-4 rounded-2xl border outline-none" onChange={e => setBookingForm({...bookingForm, endDate: e.target.value})} required />
                </div>
              </div>
              <textarea placeholder="Event Location Details" className="w-full bg-gray-50 p-4 rounded-2xl border outline-none h-24" onChange={e => setBookingForm({...bookingForm, address: e.target.value})} required />
              <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl">Confirm Request</button>
            </form>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md h-20 flex items-center justify-around border-t shadow-2xl z-50 rounded-t-[2.5rem] px-8">
        <button onClick={() => setView('home')} className={`p-3 rounded-2xl ${view === 'home' ? 'text-blue-600 bg-blue-50 shadow-inner' : 'text-gray-300'}`}><i className="fas fa-home text-xl"></i></button>
        <button onClick={() => setView('bookings')} className={`p-3 rounded-2xl ${view === 'bookings' ? 'text-blue-600 bg-blue-50 shadow-inner' : 'text-gray-300'}`}><i className="fas fa-calendar-alt text-xl"></i></button>
        {user.role === 'vendor' && (
          <>
            <button onClick={() => setView('my-services')} className={`p-3 rounded-2xl ${view === 'my-services' ? 'text-purple-600 bg-purple-50 shadow-inner' : 'text-gray-300'}`}><i className="fas fa-list-ul text-xl"></i></button>
            <button onClick={() => { setServiceForm({ title: '', category: 'tent', rate: '', unitType: 'Per Day', duration: '1 Day', itemsIncluded: [], contactNumber: '', _id: '', customItem: '' }); setView('vendor-dashboard'); }} className={`p-3 rounded-2xl ${view === 'vendor-dashboard' ? 'text-purple-600 bg-purple-50 shadow-inner' : 'text-gray-300'}`}><i className="fas fa-plus-circle text-xl"></i></button>
          </>
        )}
        <button onClick={() => { localStorage.clear(); setUser(null); }} className="p-3 text-red-400"><i className="fas fa-power-off text-xl"></i></button>
      </nav>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default App;
