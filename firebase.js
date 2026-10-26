import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, doc, setDoc, deleteDoc, collection, getDocs, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAjMsxk0__VsFf37h9vyAIBlNDoNwLghUY",
  authDomain: "aplikasi-awal-cb8bc.firebaseapp.com",
  projectId: "aplikasi-awal-cb8bc",
  storageBucket: "aplikasi-awal-cb8bc.firebasestorage.app",
  messagingSenderId: "393090474476",
  appId: "1:393090474476:web:2a2de286c3b9b6bd9160c9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const stocksDocRef = doc(db, "app_stocks", "main_stock");
const txCollectionRef = collection(db, "app_transactions");
const pbucDocRef = doc(db, "app_pbuc", "main_pbuc");
const kmCollectionRef = collection(db, "app_km_logs");

window.syncStockToCloud = async function(stockObj) {
  try { await setDoc(stocksDocRef, { stockData: stockObj }); } catch (e) {}
};

window.syncTxToCloud = async function(txObj) {
  try { await setDoc(doc(txCollectionRef, String(txObj.id)), txObj); } catch (e) {}
};

window.syncKmToCloud = async function(kmObj) {
  try { await setDoc(doc(kmCollectionRef, String(kmObj.id)), kmObj); } catch (e) {}
};

window.savePbucData = async function() {
  try {
    await setDoc(pbucDocRef, { pbucData: window.pbucData });
    alert("Data PBUC Berhasil Disimpan!");
  } catch (e) { alert("Gagal Simpan PBUC"); }
};

window.confirmResetAllDatabase = async function() {
  closeModal('modal-reset-db');
  try {
    await deleteDoc(stocksDocRef);
    await deleteDoc(pbucDocRef);
    const snaps = await getDocs(txCollectionRef);
    await Promise.all(snaps.docs.map(d => deleteDoc(d.ref)));
    window.stockData = {};
    window.transactions = [];
    window.pbucData = {};
    window.kmLogs = [];
    renderAllViews();
    alert("Database Berhasil Dibersihkan!");
  } catch (e) { alert("Gagal Reset DB"); }
};

// LISTENERS FIREBASE REALTIME
onSnapshot(stocksDocRef, (docSnap) => {
  if (docSnap.exists() && docSnap.data().stockData) {
    window.stockData = docSnap.data().stockData;
  }
  renderAllViews();
});

onSnapshot(txCollectionRef, (snapshot) => {
  const list = [];
  snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
  window.transactions = list;
  renderAllViews();
});

onSnapshot(pbucDocRef, (docSnap) => {
  if (docSnap.exists() && docSnap.data().pbucData) {
    window.pbucData = docSnap.data().pbucData;
  }
  renderAllViews();
});

onSnapshot(kmCollectionRef, (snapshot) => {
  const list = [];
  snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
  window.kmLogs = list;
  renderAllViews();
});
