import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCdHmdrgtLIdnCQ7w4BRyWncS7_nFcxdtA",
  authDomain: "editor-drop.firebaseapp.com",
  projectId: "editor-drop",
  storageBucket: "editor-drop.firebasestorage.app",
  messagingSenderId: "627419081969",
  appId: "1:627419081969:web:7d3ba2a53db5bcdcc90d50"
};

const CLOUDINARY_CLOUD_NAME = "ykfzqvzs";
const CLOUDINARY_PRESET = "photo_drop";
const ADMIN_EMAIL = "undercoverhaein@gmail.com";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let deadlineDate = null;
let timerInterval = null;
let cachedAdmin = false;

onAuthStateChanged(auth, (user) => { if (user && user.email === ADMIN_EMAIL) cachedAdmin = true; });

function showToast(msg) {
  const c = document.getElementById("toastContainer");
  const t = document.createElement("div"); t.className = "glass-toast"; t.innerText = msg;
  c.appendChild(t); setTimeout(() => t.remove(), 4000);
}
window.showToast = showToast;

function timeAgo(date) {
  if (!date) return "Just now";
  const seconds = Math.floor((new Date() - date) / 1000);
  let int = seconds / 86400; if (int >= 1) return Math.floor(int) + " days ago";
  int = seconds / 3600; if (int >= 1) return Math.floor(int) + " hours ago";
  int = seconds / 60; if (int >= 1) return Math.floor(int) + " mins ago";
  return "Just now";
}

// Gate & Video Initialization
const entryGate = document.getElementById("entryGate");
const video = document.getElementById("instructionVideo");

document.getElementById("enterSiteBtn").addEventListener("click", () => {
  entryGate.style.opacity = "0"; setTimeout(() => entryGate.classList.add("hidden"), 400);
  if (video.src && video.src !== window.location.href) { video.volume = 1; video.play().catch(()=>{}); }
});

// Standard Classical Carousel Logic
let carIndex = 0;
let carTimer;
const track = document.getElementById("carouselTrack");

function updateCarousel() {
  const slides = track.querySelectorAll('.car-slide-wrapper:not(.hidden-slide)');
  if (slides.length <= 1) {
    document.getElementById("carPrev").style.display = "none";
    document.getElementById("carNext").style.display = "none";
    document.getElementById("carouselDots").style.display = "none";
    track.style.transform = `translateX(0%)`;
    return;
  }
  
  document.getElementById("carPrev").style.display = "flex";
  document.getElementById("carNext").style.display = "flex";
  document.getElementById("carouselDots").style.display = "flex";

  if (carIndex >= slides.length) carIndex = 0;
  if (carIndex < 0) carIndex = slides.length - 1;

  track.style.transform = `translateX(-${carIndex * 100}%)`;

  const dots = document.querySelectorAll('#carouselDots .dot');
  dots.forEach((d, i) => d.classList.toggle('active', i === carIndex));
}

function startCarousel() {
  clearInterval(carTimer);
  carTimer = setInterval(() => { carIndex++; updateCarousel(); }, 4000); // Slides every 4s
}

function rebuildDots() {
  const slides = track.querySelectorAll('.car-slide-wrapper:not(.hidden-slide)');
  const dc = document.getElementById("carouselDots");
  dc.innerHTML = "";
  for(let i=0; i<slides.length; i++) {
    const d = document.createElement("span"); d.className = "dot";
    if(i===0) d.classList.add("active");
    d.onclick = () => { carIndex = i; updateCarousel(); startCarousel(); };
    dc.appendChild(d);
  }
}

document.getElementById("carPrev").addEventListener("click", () => { carIndex--; updateCarousel(); startCarousel(); });
document.getElementById("carNext").addEventListener("click", () => { carIndex++; updateCarousel(); startCarousel(); });


// Video Controls
const ppBtn = document.getElementById("btnPlayPause");
const seek = document.getElementById("seekSlider");
const vol = document.getElementById("volumeSlider");
ppBtn.addEventListener("click", () => {
  if (video.paused) { video.play(); ppBtn.innerText = "⏸ Pause"; } else { video.pause(); ppBtn.innerText = "▶ Play"; }
});
document.getElementById("btnBack5").addEventListener("click", () => video.currentTime -= 5);
document.getElementById("btnFwd5").addEventListener("click", () => video.currentTime += 5);
video.addEventListener("timeupdate", () => seek.value = (100 / video.duration) * video.currentTime || 0);
seek.addEventListener("input", () => video.currentTime = video.duration * (seek.value / 100));
vol.addEventListener("input", () => video.volume = vol.value);


// DB Sync Config
onSnapshot(doc(db, "config", "settings"), (snap) => {
  if (snap.exists()) {
    const d = snap.data();
    if (d.deadline) { deadlineDate = new Date(d.deadline); startAppleTimer(); }
    
    if (d.preview1 || d.preview2) {
      document.getElementById("previewSection").style.display = "block";
      
      const w1 = document.getElementById("ref1Wrap");
      const w2 = document.getElementById("ref2Wrap");
      
      if (d.preview1) { document.getElementById("ref1").src = d.preview1; w1.classList.remove("hidden-slide"); } else { w1.classList.add("hidden-slide"); }
      if (d.preview2) { document.getElementById("ref2").src = d.preview2; w2.classList.remove("hidden-slide"); } else { w2.classList.add("hidden-slide"); }
      
      carIndex = 0;
      rebuildDots();
      updateCarousel();
      startCarousel();
    } else {
      document.getElementById("previewSection").style.display = "none";
    }
    
    if (d.videoUrl) {
      document.getElementById("videoSection").style.display = "block";
      document.getElementById("videoSource").src = d.videoUrl; video.load();
    } else {
      document.getElementById("videoSection").style.display = "none";
    }
  }
});


// Apple Ripple Timer
function startAppleTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!deadlineDate) return;
    const diff = deadlineDate.getTime() - Date.now();
    const abs = Math.abs(diff);
    
    document.getElementById("t-hours").innerText = Math.floor(abs / (1000 * 60 * 60)).toString().padStart(2, "0");
    document.getElementById("t-minutes").innerText = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, "0");
    document.getElementById("t-seconds").innerText = Math.floor((abs % (1000 * 60)) / 1000).toString().padStart(2, "0");
    
    document.getElementById("timerStatus").textContent = diff < 0 ? "DEADLINE PASSED" : "Time remaining before submission lock";

    document.querySelectorAll('.time-updater').forEach(el => {
      if(el.dataset.time) el.innerText = timeAgo(new Date(parseInt(el.dataset.time)));
    });
  }, 1000);
}


let myId = localStorage.getItem("mySubId") || doc(collection(db, "submissions")).id;
let uploadTime = localStorage.getItem("mySubTime") || 0;

// Leaderboard Sync
onSnapshot(query(collection(db, "submissions"), orderBy("time", "asc")), (snap) => {
  const orgList = document.getElementById("organizerList");
  const regList = document.getElementById("rosterList");
  const gallery = document.getElementById("adminGallery");
  orgList.innerHTML = ""; regList.innerHTML = ""; gallery.innerHTML = "";
  document.getElementById("rosterCounter").textContent = `${snap.size} Uploads`;
  let rank = 1;

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    const id = docSnap.id;
    const canEdit = (id === myId && (Date.now() - uploadTime) < 300000); 
    const editBtn = canEdit ? `<button class="btn-edit-user" onclick="triggerUserEdit('${d.firstName}','${d.lastName}','${d.role}')">Edit</button>` : "";
    
    let tsMillis = d.time ? (d.time.toMillis ? d.time.toMillis() : Date.now()) : Date.now();
    const timeHtml = `<div class="chess-time time-updater" data-time="${tsMillis}">${timeAgo(new Date(tsMillis))}</div>`;

    const cardHtml = `
      <div class="chess-row">
        ${!d.isOrganizer ? `<div class="chess-rank">${rank++}</div>` : ''}
        <div class="chess-details">
          <span class="chess-name">${d.firstName} ${d.lastName}</span>
          <span class="chess-role">${d.role}</span>
          ${timeHtml}
        </div>
        <div class="chess-status">
          ${editBtn} <span class="chess-tick">✔</span>
        </div>
      </div>`;
    
    d.isOrganizer ? (orgList.innerHTML += cardHtml) : (regList.innerHTML += cardHtml);

    // Admin Gallery Cards
    let imgHtml = `<div class="no-img-placeholder">Manual Entry</div>`;
    let dlBtn = '';
    if (d.imageUrl) {
      if (d.imageUrl.includes(".mp4") || d.imageUrl.includes(".mov")) {
        imgHtml = `<video src="${d.imageUrl}" style="width:100%; height:220px; object-fit:cover; background:#000;" controls></video>`;
      } else {
        imgHtml = `<img src="${d.imageUrl}">`;
      }
      dlBtn = `<button class="btn-admin-action green-btn" style="flex:1" onclick="window.open('${d.imageUrl}', '_blank')">Download File</button>`;
    }

    gallery.innerHTML += `
      <div class="gallery-card" id="gal-${id}">
        ${imgHtml}
        <div class="gallery-info">
          <h4>${d.firstName} ${d.lastName}</h4><p style="color:#64748b; font-size:0.85rem; margin-bottom:15px;">${d.role}</p>
          <div style="display:flex; gap:8px; margin-bottom: 10px;">
            <button class="btn-admin-action" style="flex:1" onclick="navigator.clipboard.writeText('${d.firstName} ${d.lastName} - ${d.role}'); showToast('Copied!')">Copy Info</button>
            ${dlBtn}
          </div>
          <button class="btn-danger" onclick="showDeleteConfirm('${id}')">Delete Entry</button>
          <div class="del-req-box hidden" id="delbox-${id}">
            <input type="text" id="delinput-${id}" class="del-input" placeholder="Type 'delete'" autocomplete="off">
            <button class="btn-confirm-del" onclick="executeDelete('${id}')">Confirm</button>
          </div>
        </div>
      </div>`;
  });
});

window.showDeleteConfirm = (id) => document.getElementById(`delbox-${id}`).classList.remove("hidden");
window.executeDelete = async (id) => {
  if (document.getElementById(`delinput-${id}`).value.toLowerCase() === "delete") {
    await deleteDoc(doc(db, "submissions", id)); showToast("Deleted successfully.");
  } else { showToast("Type 'delete' exactly."); }
};

window.triggerUserEdit = (f, l, r) => {
  document.getElementById("firstName").value = f; document.getElementById("lastName").value = l; document.getElementById("role").value = r;
  document.getElementById("editNotice").classList.remove("hidden"); window.scrollTo({ top: 0, behavior: "smooth" });
};

// Main User Upload XHR Process
let selectedFile = null;
const fileInput = document.getElementById("fileInput");
fileInput.addEventListener("change", (e) => {
  if (e.target.files[0]) {
    selectedFile = e.target.files[0];
    document.getElementById("dropzoneContent").innerHTML = `<span style="font-size:2rem">✅</span><h3>${selectedFile.name}</h3><small>Ready for review</small>`;
  }
});

document.getElementById("reviewBtn").addEventListener("click", () => {
  const f = document.getElementById("firstName").value.trim(); const l = document.getElementById("lastName").value.trim(); const r = document.getElementById("role").value.trim();
  if (!f || !l || !r || !selectedFile) { showToast("Please fill all fields and select a picture."); return; }
  document.getElementById("uploadForm").classList.add("hidden"); document.getElementById("reviewContainer").classList.remove("hidden");
  document.getElementById("reviewName").innerHTML = `${f} <span style="font-weight:400; font-size:0.9em;">${l}</span>`; document.getElementById("reviewRole").innerText = r;
  
  if (selectedFile.type.includes("video")) { document.getElementById("reviewImage").style.display = "none"; } 
  else { document.getElementById("reviewImage").style.display = "block"; document.getElementById("reviewImage").src = URL.createObjectURL(selectedFile); }
});

document.getElementById("cancelReviewBtn").addEventListener("click", () => {
  document.getElementById("uploadForm").classList.remove("hidden"); document.getElementById("reviewContainer").classList.add("hidden");
});

document.getElementById("confirmSubmitBtn").addEventListener("click", () => {
  document.getElementById("uploadOverlay").classList.remove("hidden");
  const fd = new FormData(); fd.append("file", selectedFile); fd.append("upload_preset", CLOUDINARY_PRESET);
  
  const xhr = new XMLHttpRequest(); xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`);
  
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const p = Math.round((e.loaded / e.total) * 100);
      document.getElementById("progressBar").style.width = p + "%"; 
      document.getElementById("progressPercent").textContent = p + "%";
      if (p === 100) document.getElementById("overlayText").innerText = "Securing Assets...";
    }
  };
  xhr.onload = async () => {
    if (xhr.status === 200) {
      const res = JSON.parse(xhr.responseText);
      await setDoc(doc(db, "submissions", myId), {
        firstName: document.getElementById("firstName").value, lastName: document.getElementById("lastName").value, role: document.getElementById("role").value,
        imageUrl: res.secure_url, isOrganizer: false, time: serverTimestamp()
      });
      uploadTime = Date.now(); localStorage.setItem("mySubId", myId); localStorage.setItem("mySubTime", uploadTime);
      document.getElementById("uploadForm").reset(); selectedFile = null;
      document.getElementById("dropzoneContent").innerHTML = `<span style="font-size:2rem">📸</span><h3>Choose High-Quality Picture</h3><small>Click to browse files</small>`;
      
      document.getElementById("uploadOverlay").classList.add("hidden");
      document.getElementById("reviewContainer").classList.add("hidden");
      document.getElementById("formCard").classList.add("hidden"); 
      document.getElementById("successCard").classList.remove("hidden");
      showToast("Got something wrong? You have five minutes to edit your submission.");
    } else { 
      showToast("Upload failed."); document.getElementById("uploadOverlay").classList.add("hidden");
    }
  };
  xhr.send(fd);
});

document.getElementById("resetBtn").addEventListener("click", () => { document.getElementById("uploadForm").classList.remove("hidden"); document.getElementById("successCard").classList.add("hidden"); document.getElementById("formCard").classList.remove("hidden"); document.getElementById("editNotice").classList.add("hidden"); });

// Admin Login
let taps = 0, lastTap = 0;
document.getElementById("secretTrigger").addEventListener("click", () => {
  const now = Date.now(); if (now - lastTap < 500) taps++; else taps = 1; lastTap = now;
  if (taps === 3) {
    taps = 0;
    if (cachedAdmin) { document.getElementById("adminPanel").classList.remove("hidden"); } 
    else {
      signInWithPopup(auth, provider).then((res) => {
        if (res.user.email === ADMIN_EMAIL) document.getElementById("adminPanel").classList.remove("hidden"); else showToast("Access Denied.");
      });
    }
  }
});
document.getElementById("closeAdminBtn").addEventListener("click", () => document.getElementById("adminPanel").classList.add("hidden"));

document.getElementById("tabSettings").addEventListener("click", (e) => { e.target.classList.add("active"); document.getElementById("tabGallery").classList.remove("active"); document.getElementById("viewSettings").classList.remove("hidden"); document.getElementById("viewGallery").classList.add("hidden"); });
document.getElementById("tabGallery").addEventListener("click", (e) => { e.target.classList.add("active"); document.getElementById("tabSettings").classList.remove("active"); document.getElementById("viewGallery").classList.remove("hidden"); document.getElementById("viewSettings").classList.add("hidden"); });

// Admin Dashboard XHR Upload With Progress Overlay
function adminCloudUploadWithProgress(file, labelTitle) {
  return new Promise((resolve, reject) => {
    document.getElementById("adminUploadOverlay").classList.remove("hidden");
    document.getElementById("adminOverlayText").innerText = labelTitle;
    document.getElementById("adminProgressBar").style.width = "0%";
    document.getElementById("adminProgressPercent").innerText = "0%";

    const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", CLOUDINARY_PRESET);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const p = Math.round((e.loaded / e.total) * 100);
        document.getElementById("adminProgressBar").style.width = p + "%";
        document.getElementById("adminProgressPercent").innerText = p + "%";
        if(p === 100) document.getElementById("adminOverlayText").innerText = "Processing File...";
      }
    };
    
    xhr.onload = () => {
      document.getElementById("adminUploadOverlay").classList.add("hidden");
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText).secure_url);
      else { showToast("Upload failed server-side."); reject("Failed"); }
    };
    
    xhr.onerror = () => {
      document.getElementById("adminUploadOverlay").classList.add("hidden");
      showToast("Network Error."); reject("Error");
    };
    
    xhr.send(fd);
  });
}

// Config Saving & Removals
document.getElementById("saveTimerBtn").addEventListener("click", async () => { await setDoc(doc(db, "config", "settings"), { deadline: new Date(document.getElementById("adminTimer").value).toISOString() }, { merge: true }); showToast("Timer Updated!"); });

document.getElementById("uploadVideoBtn").addEventListener("click", async () => { 
  const f = document.getElementById("adminVideoFile").files[0]; if (!f) return; 
  try {
    const url = await adminCloudUploadWithProgress(f, "Uploading Video..."); 
    await setDoc(doc(db, "config", "settings"), { videoUrl: url }, { merge: true }); 
    showToast("Video Live!");
  } catch(e){}
});
document.getElementById("removeVideoBtn").addEventListener("click", async () => { await setDoc(doc(db, "config", "settings"), { videoUrl: "" }, { merge: true }); showToast("Video Removed."); });

document.getElementById("uploadImgBtn1").addEventListener("click", async () => { 
  const f = document.getElementById("adminImgFile1").files[0]; if (!f) return; 
  try {
    const url = await adminCloudUploadWithProgress(f, "Uploading Picture 1..."); 
    await setDoc(doc(db, "config", "settings"), { preview1: url }, { merge: true }); 
    showToast("Pic 1 Saved!"); 
  } catch(e){}
});
document.getElementById("removeImgBtn1").addEventListener("click", async () => { await setDoc(doc(db, "config", "settings"), { preview1: "" }, { merge: true }); showToast("Pic 1 Removed."); });

document.getElementById("uploadImgBtn2").addEventListener("click", async () => { 
  const f = document.getElementById("adminImgFile2").files[0]; if (!f) return; 
  try {
    const url = await adminCloudUploadWithProgress(f, "Uploading Picture 2..."); 
    await setDoc(doc(db, "config", "settings"), { preview2: url }, { merge: true }); 
    showToast("Pic 2 Saved!"); 
  } catch(e){}
});
document.getElementById("removeImgBtn2").addEventListener("click", async () => { await setDoc(doc(db, "config", "settings"), { preview2: "" }, { merge: true }); showToast("Pic 2 Removed."); });

document.getElementById("seedBtn").addEventListener("click", async () => {
  const f = document.getElementById("seedFirst"); const l = document.getElementById("seedLast"); const r = document.getElementById("seedRole");
  if (!f.value || !l.value) return;
  await setDoc(doc(collection(db, "submissions")), { firstName: f.value, lastName: l.value, role: r.value, isOrganizer: true, time: serverTimestamp() });
  f.value = ""; l.value = ""; r.value = ""; showToast("User added to leaderboard!");
});
