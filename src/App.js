import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const APPS_SCRIPT_URL = "YOUR_WEB_APP_URL_HERE";
const API_PIN = "ROHIT_SECURE_2026"; 

function Autocomplete({ value, onChange, options, onCreate, placeholder }) {
  const [showList, setShowList] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setShowList(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = !value ? [] : options.filter(opt => opt.toLowerCase().includes(value.toLowerCase())).sort((a, b) => {
    const aLow = a.toLowerCase(), bLow = b.toLowerCase(), vLow = value.toLowerCase();
    if (aLow === vLow) return -1; if (bLow === vLow) return 1;
    if (aLow.startsWith(vLow) && !bLow.startsWith(vLow)) return -1;
    if (bLow.startsWith(vLow) && !aLow.startsWith(vLow)) return 1;
    return 0;
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!value) return;
    const exists = options.some(opt => opt.toLowerCase() === value.toLowerCase());
    if (exists) { alert("Error: Party/Name already exists"); return; }
    onCreate(value);
    setShowList(false);
  };

  return (
    <div className="autocomplete-container" ref={wrapperRef}>
      <div style={{ position: 'relative', width: '100%' }}>
        <input className="autocomplete-input" type="text" value={value} onChange={e => { onChange(e.target.value); setShowList(true); }} onFocus={() => setShowList(true)} placeholder={placeholder} />
        {showList && filtered.length > 0 && (
          <ul className="autocomplete-list">
            {filtered.map(opt => (
              <li key={opt} onClick={() => { onChange(opt); setShowList(false); }}>{opt}</li>
            ))}
          </ul>
        )}
      </div>
      <button className="create-btn" onClick={handleCreate}>Create New</button>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('Transaction');
  const [lists, setLists] = useState({ parties: [], transactions: [] });

  useEffect(() => {
    fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify({ apiPin: API_PIN, action: "init" }) })
      .then(r => r.json())
      .then(data => setLists({ parties: data.parties || [], transactions: data.transactions || [] }))
      .catch(console.error);
  }, []);

  const createEntity = async (type, name) => {
    const listKey = type === 'Party' ? 'parties' : 'transactions';
    setLists(prev => ({ ...prev, [listKey]: [...prev[listKey], name] }));
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ apiPin: API_PIN, action: "createEntity", payload: { type, name } })
    });
    alert(`${type} created successfully.`);
  };

  return (
    <div className="App" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Fund Tracker</h2>
      <div style={{ marginBottom: '20px' }}>
        <button type="button" onClick={() => setActiveTab('Transaction')} style={btnStyle(activeTab === 'Transaction')}>Transactions</button>
        <button type="button" onClick={() => setActiveTab('Receipt')} style={btnStyle(activeTab === 'Receipt')}>Receipts</button>
      </div>
      {activeTab === 'Transaction' && <TransactionForm lists={lists} onCreateEntity={createEntity}/>}
      {activeTab === 'Receipt' && <ReceiptForm lists={lists} onCreateEntity={createEntity}/>}
    </div>
  );
}

function TransactionForm({ lists, onCreateEntity }) {
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], from: '', to: '', purpose: '', amount: '', mode: 'Ac transfer', remarks: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify({ apiPin: API_PIN, action: "logTransaction", payload: form }) });
    alert("Transaction logged!");
    setForm({ ...form, from: '', to: '', purpose: '', amount: '', remarks: '' });
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <label>Date: <input type="date" className="autocomplete-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></label>
      <label>From: <Autocomplete onChange={v => setForm({ ...form, from: v })} value={form.from} options={lists.parties} onCreate={v => onCreateEntity('Party', v)} /></label>
      <label>To: <Autocomplete onChange={v => setForm({ ...form, to: v })} value={form.to} options={lists.parties} onCreate={v => onCreateEntity('Party', v)} /></label>
      <label>Transaction Name: <Autocomplete onChange={v => setForm({ ...form, purpose: v })} value={form.purpose} options={lists.transactions} onCreate={v => onCreateEntity('Transaction', v)} /></label>
      <label>Amount (₹): <input type="number" className="autocomplete-input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></label>
      <label>Mode: 
        <select className="autocomplete-input" value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>
          <option>Ac transfer</option><option>Cash</option><option>Cheque</option>
        </select>
      </label>
      <label>Remarks: <input type="text" className="autocomplete-input" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} /></label>
      <button type="submit" style={submitBtnStyle}>Submit Transaction</button>
    </form>
  );
}

function ReceiptForm({ lists, onCreateEntity }) {
  const [form, setForm] = useState({ 
    date: new Date().toISOString().split('T')[0], from: '', to: '', basicAmount: '', 
    exp1Name: '', exp1Val: '', exp1Type: '%', taxInc1: false,
    exp2Name: '', exp2Val: '', exp2Type: '%', taxInc2: false,
    exp3Name: '', exp3Val: '', exp3Type: '%', taxInc3: false,
    taxRate: 18
  });

  const getCalc = () => {
    let b = parseFloat(form.basicAmount) || 0;
    let e1 = form.exp1Type === '%' ? b * ((parseFloat(form.exp1Val) || 0) / 100) : (parseFloat(form.exp1Val) || 0);
    let e2 = form.exp2Type === '%' ? b * ((parseFloat(form.exp2Val) || 0) / 100) : (parseFloat(form.exp2Val) || 0);
    let e3 = form.exp3Type === '%' ? b * ((parseFloat(form.exp3Val) || 0) / 100) : (parseFloat(form.exp3Val) || 0);
    let taxBase = b + (form.taxInc1 ? e1 : 0) + (form.taxInc2 ? e2 : 0) + (form.taxInc3 ? e3 : 0);
    let taxAmt = taxBase * ((parseFloat(form.taxRate) || 0) / 100);
    let total = b + e1 + e2 + e3 + taxAmt;
    return { e1, e2, e3, taxAmt, total };
  };

  const c = getCalc();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify({ apiPin: API_PIN, action: "logReceipt", payload: { ...form, calc: c } }) });
    alert("Receipt logged!");
  };

  const renderExp = (num) => (
    <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '5px' }}>
      <label>Expense {num}: <Autocomplete onChange={v => setForm({ ...form, [`exp${num}Name`]: v })} value={form[`exp${num}Name`]} options={lists.transactions} onCreate={v => onCreateEntity('Transaction', v)} /></label>
      <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
        <input type="number" className="autocomplete-input" value={form[`exp${num}Val`]} onChange={e => setForm({ ...form, [`exp${num}Val`]: e.target.value })} placeholder="Value" />
        <select className="autocomplete-input" style={{ width: '60px' }} value={form[`exp${num}Type`]} onChange={e => setForm({ ...form, [`exp${num}Type`]: e.target.value })}><option>%</option><option>₹</option></select>
      </div>
      <label style={{ fontSize: '12px', marginTop: '5px', display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={form[`taxInc${num}`]} onChange={e => setForm({ ...form, [`taxInc${num}`]: e.target.checked })} /> Include in Tax Base (₹{c[`e${num}`].toFixed(2)})</label>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <label>Date: <input type="date" className="autocomplete-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></label>
      <label>From: <Autocomplete onChange={v => setForm({ ...form, from: v })} value={form.from} options={lists.parties} onCreate={v => onCreateEntity('Party', v)} /></label>
      <label>To: <Autocomplete onChange={v => setForm({ ...form, to: v })} value={form.to} options={lists.parties} onCreate={v => onCreateEntity('Party', v)} /></label>
      <label>Basic Amount (₹): <input type="number" className="autocomplete-input" value={form.basicAmount} onChange={e => setForm({ ...form, basicAmount: e.target.value })} required /></label>
      {renderExp(1)} {renderExp(2)} {renderExp(3)}
      <label>Tax Rate (%): <input type="number" className="autocomplete-input" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: e.target.value })} /></label>
      <div style={{ background: '#e9ecef', padding: '10px', borderRadius: '5px', fontWeight: 'bold' }}>
        <p>Tax Amount: ₹{c.taxAmt.toFixed(2)}</p><p>Total Value: ₹{c.total.toFixed(2)}</p>
      </div>
      <button type="submit" style={submitBtnStyle}>Submit Receipt</button>
    </form>
  );
}

const formStyle = { display: 'flex', flexDirection: 'column', maxWidth: '400px', gap: '15px', textAlign: 'left', margin: 'auto', paddingBottom: '50px' };
const btnStyle = (a) => ({ padding: '10px 20px', cursor: 'pointer', backgroundColor: a ? '#007BFF' : '#ddd', color: a ? '#fff' : '#333', border: 'none', marginRight: '5px', borderRadius: '5px' });
const submitBtnStyle = { padding: '12px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };

export default App;
