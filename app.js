import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot, query, orderBy, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
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
let isIntroGliding = false; 
let isVideoPrepping = false;

onAuthStateChanged(auth, (user) => { if (user && user.email === ADMIN_EMAIL) cachedAdmin = true; });

function smoothScrollToY(endY, duration) {
  const startY = window.scrollY || window.pageYOffset;
  const distance = endY - startY;
  const startTime = performance.now();

  return new Promise(resolve => {
    function step(time) {
      let progress = (time - startTime) / duration;
      if (progress > 1) progress = 1;
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      window.scrollTo(0, startY + distance * ease);
      if (progress < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

function showToast(msg, scrollToForm = false) {
  const c = document.getElementById("toastContainer");
  const t = document.createElement("div"); t.className = "glass-toast"; 
  t.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> <span>${msg}</span>`;
  
  if (scrollToForm) {
    t.onclick = () => {
      document.getElementById("formCard").scrollIntoView({ behavior: 'smooth', block: 'center' });
      t.remove();
    };
  }
  
  c.appendChild(t); 
  setTimeout(() => { if(t.parentElement) t.remove(); }, 6000);
}
window.showToast = showToast;

function timeAgo(date) {
  if (!date) return "Just now";
  const seconds = Math.floor((new Date() - date) / 1000);
  let int = seconds / 86400; if (int >= 1) return Math.floor(int) + " days ago";
  int = seconds / 3600; if (int >= 1) return Math.floor(int) + " hrs ago";
  int = seconds / 60; if (int >= 1) return Math.floor(int) + " mins ago";
  return "Just now";
}

const entryGate = document.getElementById("entryGate");
const entryLoader = document.getElementById("entryLoader");
const video = document.getElementById("instructionVideo");

document.getElementById("enterSiteBtn").addEventListener("click", () => {
  const isReturningUser = localStorage.getItem("siteVisited") === "true";
  localStorage.setItem("siteVisited", "true");
  
  entryGate.style.display = "none"; 
  entryLoader.classList.remove("hidden");
  
  if (video.src && video.src !== window.location.href) {
    isVideoPrepping = true; 
    const ppBtn = document.getElementById("btnPlayPause");
    if(ppBtn) ppBtn.style.opacity = "0";

    video.muted = false;
    video.volume = 1;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.then(() => { 
        video.pause(); 
        video.currentTime = 0; 
        isVideoPrepping = false;
        if(ppBtn) ppBtn.style.opacity = "1";
      }).catch(() => {
        isVideoPrepping = false;
        if(ppBtn) ppBtn.style.opacity = "1";
      });
    } else {
      isVideoPrepping = false;
      if(ppBtn) ppBtn.style.opacity = "1";
    }
  }

  let hasInitiatedGlide = false;
  
  const startSequence = () => {
    if(hasInitiatedGlide) return;
    hasInitiatedGlide = true;
    isIntroGliding = true; 
    
    if (!isReturningUser) {
      window.scrollTo(0, document.body.scrollHeight);
    } else {
      const vidSec = document.getElementById("videoSection");
      if(vidSec && vidSec.style.display !== "none") {
        const targetY = vidSec.getBoundingClientRect().top + window.scrollY - (window.innerHeight / 2) + (vidSec.offsetHeight / 2);
        window.scrollTo(0, targetY);
      }
    }
    
    entryLoader.style.opacity = "0";
    
    setTimeout(() => { 
      entryLoader.classList.add("hidden"); 
      
      const playVideoFinal = () => {
        video.currentTime = 0;
        isVideoPrepping = false; 
        if(document.getElementById("btnPlayPause")) document.getElementById("btnPlayPause").style.opacity = "1";
        video.play().catch(()=>{});
        setTimeout(() => { isIntroGliding = false; }, 500);
      };

      if (!isReturningUser) {
        smoothScrollToY(0, 2500).then(() => {
          const vidSec = document.getElementById("videoSection");
          if(vidSec.style.display !== "none") {
            const targetY = vidSec.getBoundingClientRect().top + window.scrollY - (window.innerHeight / 2) + (vidSec.offsetHeight / 2);
            smoothScrollToY(targetY, 2500).then(playVideoFinal);
          } else {
            isIntroGliding = false;
          }
        });
      } else {
        playVideoFinal();
      }
    }, 400);
  };

  setTimeout(() => {
    if (video.readyState >= 3 || !video.src || video.src === window.location.href) {
      startSequence();
    } else {
      const checkVid = setInterval(() => { if (video.readyState >= 3) { clearInterval(checkVid); startSequence(); } }, 500);
      setTimeout(() => { clearInterval(checkVid); startSequence(); }, 3000); 
    }
  }, 3000); 
});

const videoContainer = document.getElementById("videoContainer");
const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (isIntroGliding) return;
    if (!e.isIntersecting && !video.paused) {
      videoContainer.classList.add("mini-player");
      video.setAttribute("controls", "true");
    } else {
      videoContainer.classList.remove("mini-player");
      video.removeAttribute("controls");
    }
  });
}, { threshold: 0.1 });
videoObserver.observe(document.getElementById("videoSection"));

const track = document.getElementById("carouselTrack");
let carTimer;

function updateCarouselDots() {
  const slides = track.querySelectorAll('.car-slide-wrapper:not(.hidden-slide)');
  if(slides.length <= 1) return;
  const currentIndex = parseInt(track.firstElementChild.dataset.index);
  const dots = document.querySelectorAll('#carouselDots .dot');
  dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
}

function slideNext() {
  const slides = track.querySelectorAll('.car-slide-wrapper:not(.hidden-slide)');
  if(slides.length <= 1) return;
  
  track.style.transition = 'transform 0.4s ease-in-out';
  track.style.transform = 'translateX(-100%)';
  
  setTimeout(() => {
    track.appendChild(track.firstElementChild);
    track.style.transition = 'none';
    track.style.transform = 'translateX(0)';
    updateCarouselDots();
  }, 400);
}

function startCarousel() { clearInterval(carTimer); carTimer = setInterval(slideNext, 4000); }

function initCarousel() {
  const slides = track.querySelectorAll('.car-slide-wrapper:not(.hidden-slide)');
  const dc = document.getElementById("carouselDots");
  dc.innerHTML = "";
  if(slides.length > 1) {
    slides.forEach((s, i) => {
      s.dataset.index = i;
      const d = document.createElement("span"); d.className = "dot";
      if(i===0) d.classList.add("active");
      dc.appendChild(d);
    });
    startCarousel();
  }
}

const ppBtn = document.getElementById("btnPlayPause");
const seek = document.getElementById("seekSlider");
const vol = document.getElementById("volumeSlider");
const iPlay = document.getElementById("iconPlay");
const iPause = document.getElementById("iconPause");

ppBtn.addEventListener("click", () => {
  if (video.paused) { 
    video.play(); iPlay.classList.add("hidden"); iPause.classList.remove("hidden");
  } else { 
    video.pause(); iPause.classList.add("hidden"); iPlay.classList.remove("hidden");
  }
});
video.addEventListener("play", () => { 
  if (isVideoPrepping) return;
  iPlay.classList.add("hidden"); iPause.classList.remove("hidden"); 
});
video.addEventListener("pause", () => { 
  if (isVideoPrepping) return;
  iPause.classList.add("hidden"); iPlay.classList.remove("hidden"); 
});

document.getElementById("btnBack5").addEventListener("click", () => video.currentTime -= 5);
document.getElementById("btnFwd5").addEventListener("click", () => video.currentTime += 5);
video.addEventListener("timeupdate", () => seek.value = (100 / video.duration) * video.currentTime || 0);
seek.addEventListener("input", () => video.currentTime = video.duration * (seek.value / 100));
vol.addEventListener("input", () => video.volume = vol.value);

window.copyToolLink = (num) => {
  const link = document.getElementById(`toolLink${num}`).href;
  if (link && link !== window.location.href && !link.endsWith("#")) {
    navigator.clipboard.writeText(link).then(() => showToast("Site Link Copied!"));
  } else {
    showToast("No valid link to copy yet.");
  }
};

onSnapshot(doc(db, "config", "settings"), (snap) => {
  if (snap.exists()) {
    const d = snap.data();
    if (d.deadline) { deadlineDate = new Date(d.deadline); startDigitalCountdown(); }
    
    if (d.preview1 || d.preview2) {
      document.getElementById("previewSection").style.display = "block";
      const w1 = document.getElementById("ref1Wrap"); const w2 = document.getElementById("ref2Wrap");
      if (d.preview1) { document.getElementById("ref1").src = d.preview1; w1.classList.remove("hidden-slide"); } else { w1.classList.add("hidden-slide"); }
      if (d.preview2) { document.getElementById("ref2").src = d.preview2; w2.classList.remove("hidden-slide"); } else { w2.classList.add("hidden-slide"); }
      initCarousel();
    } else {
      document.getElementById("previewSection").style.display = "none";
    }
    
    if (d.videoUrl) {
      document.getElementById("videoSection").style.display = "block";
      video.src = d.videoUrl;
    } else {
      document.getElementById("videoSection").style.display = "none";
    }

    if (d.tool1Title || d.tool2Title || d.tool3Title) {
      document.getElementById("toolsSection").style.display = "block";
      for (let i = 1; i <= 3; i++) {
        const title = d[`tool${i}Title`];
        const url = d[`tool${i}Url`];
        const img = d[`tool${i}Img`];
        
        if (title) { document.getElementById(`toolTitle${i}`).innerText = title; document.getElementById(`adminTool${i}Title`).value = title; }
        if (url) { document.getElementById(`toolLink${i}`).href = url; document.getElementById(`adminTool${i}Url`).value = url; }
        if (img) { document.getElementById(`toolImg${i}`).src = img; }
      }
    } else {
      document.getElementById("toolsSection").style.display = "none";
    }
  }
});

let dotCount = 1;
setInterval(() => {
  dotCount = (dotCount % 3) + 1;
  const ld = document.getElementById("loadingDots");
  if(ld) ld.innerText = ".".repeat(dotCount);
}, 400);

function startDigitalCountdown() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!deadlineDate) return;
    const diff = deadlineDate.getTime() - Date.now();
    const abs = Math.abs(diff);
    const h = Math.floor(abs / (1000 * 60 * 60)).toString().padStart(2, "0");
    const m = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, "0");
    const s = Math.floor((abs % (1000 * 60)) / 1000).toString().padStart(2, "0");

    document.getElementById("countdown").innerText = `${diff < 0 ? "-" : ""}${h}:${m}:${s}`;
    document.getElementById("timerStatusText").innerText = diff < 0 ? "DEADLINE PASSED" : "Time remaining";

    document.querySelectorAll('.time-updater').forEach(el => {
      if(el.dataset.time) el.innerText = timeAgo(new Date(parseInt(el.dataset.time)));
    });
  }, 1000);
}

let myId = localStorage.getItem("mySubId") || doc(collection(db, "submissions")).id;
let uploadTime = localStorage.getItem("mySubTime") || 0;

const tickIcon = `<svg class="icon-svg svg-tick" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

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
    const now = Date.now();
    
    const editTime = d.editTimestamp || 0;
    const isTimeout = d.isEditing && (now - editTime > 300000); 

    if (isTimeout && id === myId && d.isEditing) {
      setDoc(doc(db, "submissions", myId), { isEditing: false }, { merge: true });
      localStorage.removeItem("isEditingLocal");
      d.isEditing = false;
    }

    const canEdit = (id === myId && (now - uploadTime) < 300000); 
    const editBtn = canEdit ? `<button class="btn-edit-user" onclick="triggerUserEdit('${d.firstName}','${d.lastName}','${d.role}')">Edit</button>` : "";
    
    let tsMillis = d.time ? (d.time.toMillis ? d.time.toMillis() : now) : now;
    const timeText = timeAgo(new Date(tsMillis));
    
    let statusHtml = "";
    if (d.isEditing && !isTimeout) {
      statusHtml = `<span class="editing-text">Editing...</span>`;
    } else {
      statusHtml = `${editBtn}<span class="chess-time time-updater" data-time="${tsMillis}">${timeText}</span>${tickIcon}`;
    }

    const cardHtml = `
      <div class="chess-row">
        ${!d.isOrganizer ? `<div class="chess-rank">${rank++}</div>` : ''}
        <div class="chess-details">
          <span class="chess-name">${d.firstName} <span style="font-weight:400;">${d.lastName}</span></span>
          <span class="chess-role">${d.role}</span>
        </div>
        <div class="chess-status">
          ${statusHtml}
        </div>
      </div>`;
    
    d.isOrganizer ? (orgList.innerHTML += cardHtml) : (regList.innerHTML += cardHtml);

    let imgHtml = `<div class="no-img-placeholder">Manual Entry</div>`;
    let dlBtn = '';
    let beforeUploadBtn = '';
    
    if (d.imageUrl) {
      if (d.imageUrl.includes(".mp4") || d.imageUrl.includes(".mov") || d.imageUrl.includes("/video/")) {
        imgHtml = `<video src="${d.imageUrl}" style="width:100%; height:220px; object-fit:cover; background:#000;" controls></video>`;
      } else {
        imgHtml = `<img src="${d.imageUrl}">`;
      }
      dlBtn = `<button class="btn-admin-action green-btn" style="flex:1" onclick="window.open('${d.imageUrl}', '_blank')">Download File</button>`;
    } else {
      beforeUploadBtn = `<button class="btn-admin-action" style="flex:1; background:#3b82f6; color:white; border:none;" onclick="triggerBeforeUpload('${id}')">Upload Before</button>`;
    }
    
    const editingClass = (d.isEditing && !isTimeout) ? "is-editing-admin" : "";
    const editingBadge = (d.isEditing && !isTimeout) ? `<div class="is-editing-badge">User editing...</div>` : "";

    let finalUploadBtn = !d.finalImageUrl 
      ? `<button class="btn-admin-action" style="flex:1; background:#facc15; border:none;" onclick="triggerFinalUpload('${id}')">Upload Final</button>`
      : `<span class="edit-badge" style="width:100%; margin-bottom:0;">Finalized & Live</span>`;

    gallery.innerHTML += `
      <div class="gallery-card ${editingClass}" id="gal-${id}">
        ${editingBadge}
        ${imgHtml}
        <div class="gallery-info">
          <h4>${d.firstName} ${d.lastName}</h4><p style="color:#64748b; font-size:0.85rem; margin-bottom:15px;">${d.role}</p>
          <div style="display:flex; gap:8px; margin-bottom: 10px;">
            <button class="btn-admin-action" style="flex:1" onclick="navigator.clipboard.writeText('${d.firstName} ${d.lastName} - ${d.role}'); showToast('Copied!')">Copy Info</button>
            ${dlBtn}
            ${beforeUploadBtn}
          </div>
          <div style="display:flex; gap:8px; margin-bottom: 10px;">
             ${finalUploadBtn}
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

window.triggerFinalUpload = async (subId) => {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await adminCloudUploadWithProgress(file, "Uploading Final Image...");
      await setDoc(doc(db, "submissions", subId), { finalImageUrl: url }, { merge: true });
      showToast("Finalized Image Paired!");
    } catch(err) { showToast("Upload failed."); }
  };
  input.click();
};

window.triggerBeforeUpload = async (subId) => {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await adminCloudUploadWithProgress(file, "Uploading Before Image...");
      await setDoc(doc(db, "submissions", subId), { imageUrl: url }, { merge: true });
      showToast("Before Image Added!");
    } catch(err) { showToast("Upload failed."); }
  };
  input.click();
};

window.showDeleteConfirm = (id) => document.getElementById(`delbox-${id}`).classList.remove("hidden");
window.executeDelete = async (id) => {
  if (document.getElementById(`delinput-${id}`).value.toLowerCase() === "delete") {
    await deleteDoc(doc(db, "submissions", id)); showToast("Deleted successfully.");
  } else { showToast("Type 'delete' exactly."); }
};

window.triggerUserEdit = async (f, l, r) => {
  const proceed = confirm("Notice: Only press Edit if you made a mistake.\n\nTo edit: Make your changes below, then press the 'Confirm Edit' button to save. Continue?");
  if (!proceed) return;

  localStorage.setItem("isEditingLocal", "true");

  document.getElementById("firstName").value = f; 
  document.getElementById("lastName").value = l; 
  document.getElementById("role").value = r;
  document.getElementById("editNotice").classList.remove("hidden"); 
  
  const revBtn = document.getElementById("reviewBtn");
  revBtn.innerText = "Confirm Edit";
  revBtn.classList.add("shake-constant");

  document.getElementById("successCard").classList.add("hidden");
  document.getElementById("formCard").classList.remove("hidden");
  document.getElementById("uploadForm").classList.remove("hidden"); 
  document.getElementById("reviewContainer").classList.add("hidden");
  
  document.getElementById("formCard").scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  try {
    await setDoc(doc(db, "submissions", myId), { isEditing: true, editTimestamp: Date.now() }, { merge: true });
  } catch(e){}
};

let selectedFile = null;
const fileInput = document.getElementById("fileInput");
fileInput.addEventListener("change", (e) => {
  if (e.target.files[0]) {
    selectedFile = e.target.files[0];
    document.getElementById("dropzoneContent").innerHTML = `
      <svg class="icon-svg" style="width:40px;height:40px;color:#10b981;" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <h3 style="color:#10b981;">${selectedFile.name}</h3><small>Ready for review</small>`;
  }
});

document.getElementById("reviewBtn").addEventListener("click", async () => {
  const f = document.getElementById("firstName").value.trim(); 
  const l = document.getElementById("lastName").value.trim(); 
  const r = document.getElementById("role").value.trim();
  const isEditing = localStorage.getItem("isEditingLocal") === "true";

  if (!f || !l || !r) { showToast("Please fill all fields."); return; }
  if (!selectedFile && !isEditing) { showToast("Please select a picture."); return; }

  if (isEditing && !selectedFile) {
    document.getElementById("uploadOverlay").classList.remove("hidden");
    document.getElementById("overlayText").innerText = "Saving Edits...";
    
    await setDoc(doc(db, "submissions", myId), {
      firstName: f, lastName: l, role: r, isEditing: false
    }, { merge: true });

    localStorage.removeItem("isEditingLocal");
    const revBtn = document.getElementById("reviewBtn");
    revBtn.innerText = "Review Submission";
    revBtn.classList.remove("shake-constant");

    document.getElementById("uploadOverlay").classList.add("hidden");
    document.getElementById("formCard").classList.add("hidden");
    document.getElementById("successCard").classList.remove("hidden");
    showToast("Edits Saved!", true);
    return;
  }

  document.getElementById("uploadForm").classList.add("hidden"); 
  document.getElementById("reviewContainer").classList.remove("hidden");
  document.getElementById("reviewName").innerHTML = `${f} <span style="font-weight:400; font-size:0.9em;">${l}</span>`; 
  document.getElementById("reviewRole").innerText = r;
  
  if (selectedFile) {
    if (selectedFile.type.includes("video")) { document.getElementById("reviewImage").style.display = "none"; } 
    else { document.getElementById("reviewImage").style.display = "block"; document.getElementById("reviewImage").src = URL.createObjectURL(selectedFile); }
  }
});

document.getElementById("cancelReviewBtn").addEventListener("click", () => {
  document.getElementById("uploadForm").classList.remove("hidden"); 
  document.getElementById("reviewContainer").classList.add("hidden");
});

document.getElementById("confirmSubmitBtn").addEventListener("click", () => {
  document.getElementById("uploadOverlay").classList.remove("hidden");
  
  const fd = new FormData(); fd.append("file", selectedFile); fd.append("upload_preset", CLOUDINARY_PRESET);
  const xhr = new XMLHttpRequest(); 
  xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`);
  
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
      const resp = JSON.parse(xhr.responseText);
      let finalUrl = resp.secure_url;
      if (resp.resource_type === "video") finalUrl = finalUrl.replace("/upload/", "/upload/f_mp4,q_auto/");

      const isEditing = localStorage.getItem("isEditingLocal") === "true";
      const payload = {
        firstName: document.getElementById("firstName").value, 
        lastName: document.getElementById("lastName").value, 
        role: document.getElementById("role").value,
        imageUrl: finalUrl, 
        isOrganizer: false, 
        isEditing: false
      };
      
      if (!isEditing) payload.time = serverTimestamp();

      await setDoc(doc(db, "submissions", myId), payload, { merge: true });
      
      if (!isEditing) {
        uploadTime = Date.now(); 
        localStorage.setItem("mySubId", myId); 
        localStorage.setItem("mySubTime", uploadTime);
      }
      
      localStorage.removeItem("isEditingLocal");
      const revBtn = document.getElementById("reviewBtn");
      revBtn.innerText = "Review Submission";
      revBtn.classList.remove("shake-constant");

      document.getElementById("dropzoneContent").innerHTML = `
        <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="1.5" fill="none"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="M13 13l6 6"></path></svg>
        <h3>Choose High-Quality Picture</h3><small>Click to browse files</small>`;
      
      document.getElementById("uploadOverlay").classList.add("hidden"); document.getElementById("reviewContainer").classList.add("hidden");
      document.getElementById("formCard").classList.add("hidden"); document.getElementById("successCard").classList.remove("hidden");
      
      showToast(isEditing ? "Update Recorded!" : "Submission Recorded!", true);
    } else { 
      showToast("Upload failed."); document.getElementById("uploadOverlay").classList.add("hidden");
    }
  };
  xhr.send(fd);
});

document.getElementById("resetBtn").addEventListener("click", () => { 
  triggerUserEdit(
    document.getElementById("firstName").value,
    document.getElementById("lastName").value,
    document.getElementById("role").value
  );
});

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
        if(p === 100) document.getElementById("adminOverlayText").innerText = "Processing Format...";
      }
    };
    
    xhr.onload = () => {
      document.getElementById("adminUploadOverlay").classList.add("hidden");
      if (xhr.status === 200) {
        const resp = JSON.parse(xhr.responseText);
        let finalUrl = resp.secure_url;
        if (resp.resource_type === "video") finalUrl = finalUrl.replace("/upload/", "/upload/f_mp4,vc_h264,q_auto/");
        resolve(finalUrl);
      }
      else { showToast("Upload failed server-side."); reject("Failed"); }
    };
    xhr.onerror = () => { document.getElementById("adminUploadOverlay").classList.add("hidden"); showToast("Network Error."); reject("Error"); };
    xhr.send(fd);
  });
}

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

const saveToolText = async (step) => {
  const t = document.getElementById(`adminTool${step}Title`).value;
  const u = document.getElementById(`adminTool${step}Url`).value;
  await setDoc(doc(db, "config", "settings"), { [`tool${step}Title`]: t, [`tool${step}Url`]: u }, { merge: true });
  showToast(`Step ${step} Text Saved!`);
};
const saveToolImg = async (step) => {
  const f = document.getElementById(`adminTool${step}Img`).files[0]; if (!f) return;
  try {
    const url = await adminCloudUploadWithProgress(f, `Uploading Step ${step} Icon...`);
    await setDoc(doc(db, "config", "settings"), { [`tool${step}Img`]: url }, { merge: true });
    showToast(`Step ${step} Icon Saved!`);
  } catch(e) {}
};

document.getElementById("saveTool1TextBtn").addEventListener("click", () => saveToolText(1));
document.getElementById("uploadTool1ImgBtn").addEventListener("click", () => saveToolImg(1));
document.getElementById("saveTool2TextBtn").addEventListener("click", () => saveToolText(2));
document.getElementById("uploadTool2ImgBtn").addEventListener("click", () => saveToolImg(2));
document.getElementById("saveTool3TextBtn").addEventListener("click", () => saveToolText(3));
document.getElementById("uploadTool3ImgBtn").addEventListener("click", () => saveToolImg(3));

document.getElementById("uploadImgBtn1").addEventListener("click", async () => { 
  const f = document.getElementById("adminImgFile1").files[0]; if (!f) return; 
  try {
    const url = await adminCloudUploadWithProgress(f, "Uploading Picture 1..."); 
    await setDoc(doc(db, "config", "settings"), { preview1: url }, { merge: true }); showToast("Pic 1 Saved!"); 
  } catch(e){}
});
document.getElementById("removeImgBtn1").addEventListener("click", async () => { await setDoc(doc(db, "config", "settings"), { preview1: "" }, { merge: true }); showToast("Pic 1 Removed."); });

document.getElementById("uploadImgBtn2").addEventListener("click", async () => { 
  const f = document.getElementById("adminImgFile2").files[0]; if (!f) return; 
  try {
    const url = await adminCloudUploadWithProgress(f, "Uploading Picture 2..."); 
    await setDoc(doc(db, "config", "settings"), { preview2: url }, { merge: true }); showToast("Pic 2 Saved!"); 
  } catch(e){}
});
document.getElementById("removeImgBtn2").addEventListener("click", async () => { await setDoc(doc(db, "config", "settings"), { preview2: "" }, { merge: true }); showToast("Pic 2 Removed."); });

document.getElementById("seedBtn").addEventListener("click", async () => {
  const f = document.getElementById("seedFirst"); const l = document.getElementById("seedLast"); const r = document.getElementById("seedRole");
  if (!f.value || !l.value) return;
  await setDoc(doc(collection(db, "submissions")), { firstName: f.value, lastName: l.value, role: r.value, isOrganizer: true, time: serverTimestamp() });
  f.value = ""; l.value = ""; r.value = ""; showToast("User added to leaderboard!");
});


// -------------------------------------------------------------
// NEW RESULTS MODAL & CAROUSEL LOGIC
// -------------------------------------------------------------
const resultsModal = document.getElementById("resultsModal");
const seeResultsBtn = document.getElementById("seeResultsBtn");
const resultsTrack = document.getElementById("resultsTrack");
const liveCommentsStream = document.getElementById("liveCommentsStream");

let finalizedSubmissions = [];
let currentResIndex = 0;
let resAutoSlideTimer;
let isResInteracting = false;
let activeUnsubComments = null;

onSnapshot(query(collection(db, "submissions"), orderBy("time", "asc")), (snap) => {
  finalizedSubmissions = [];
  snap.forEach(doc => {
    const data = doc.data();
    if (data.imageUrl && data.finalImageUrl) {
      finalizedSubmissions.push({ id: doc.id, ...data });
    }
  });
});

seeResultsBtn.addEventListener("click", () => {
  if (finalizedSubmissions.length === 0) {
    showToast("No finalized results available yet.");
    return;
  }
  document.getElementById("entryGate").style.display = "none";
  entryLoader.classList.remove("hidden");
  
  setTimeout(() => {
    entryLoader.classList.add("hidden");
    resultsModal.classList.remove("hidden");
    buildResultsCarousel();
  }, 1200);
});

document.getElementById("closeResultsBtn").addEventListener("click", () => {
  resultsModal.classList.add("hidden");
  document.getElementById("entryGate").style.display = "flex";
  clearInterval(resAutoSlideTimer);
  if (activeUnsubComments) activeUnsubComments();
});

function buildResultsCarousel() {
  resultsTrack.innerHTML = "";
  finalizedSubmissions.forEach((sub, idx) => {
    const slide = document.createElement("div");
    slide.className = "result-slide-wrapper";
    slide.innerHTML = `
      <div class="ba-container" id="bacontainer-${idx}">
        <img src="${sub.finalImageUrl}" class="img-after">
        <div class="img-before-wrapper" id="bawrap-${idx}">
          <img src="${sub.imageUrl}" class="img-before">
        </div>
        <div class="slider-handle" id="bahandle-${idx}"></div>
      </div>
    `;
    resultsTrack.appendChild(slide);
    initBeforeAfterSlider(idx);
  });
  
  updateResultView(0);
  startResAutoSlide();
}

function initBeforeAfterSlider(idx) {
  const container = document.getElementById(`bacontainer-${idx}`);
  const wrapper = document.getElementById(`bawrap-${idx}`);
  const handle = document.getElementById(`bahandle-${idx}`);
  let isDragging = false;

  const moveSlider = (e) => {
    if (!isDragging) return;
    isResInteracting = true;
    let clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const rect = container.getBoundingClientRect();
    let x = clientX - rect.left;
    if (x < 0) x = 0; if (x > rect.width) x = rect.width;
    const percent = (x / rect.width) * 100;
    wrapper.style.width = `${percent}%`;
    handle.style.left = `${percent}%`;
  };

  handle.addEventListener("mousedown", () => isDragging = true);
  handle.addEventListener("touchstart", () => isDragging = true, {passive: true});
  window.addEventListener("mouseup", () => { isDragging = false; isResInteracting = false; });
  window.addEventListener("touchend", () => { isDragging = false; isResInteracting = false; });
  window.addEventListener("mousemove", moveSlider);
  window.addEventListener("touchmove", moveSlider, {passive: true});
}

function updateResultView(idx) {
  currentResIndex = idx;
  resultsTrack.style.transform = `translateX(-${currentResIndex * 100}%)`;
  document.getElementById("resultsPagination").innerText = `${currentResIndex + 1} / ${finalizedSubmissions.length}`;
  
  const currentData = finalizedSubmissions[currentResIndex];
  document.getElementById("resFirstName").innerText = currentData.firstName;
  document.getElementById("resLastName").innerText = currentData.lastName;
  document.getElementById("resRole").innerText = currentData.role;
  
  listenToComments(currentData.id);
}

function nextResSlide() { if (currentResIndex < finalizedSubmissions.length - 1) updateResultView(currentResIndex + 1); else updateResultView(0); }
function prevResSlide() { if (currentResIndex > 0) updateResultView(currentResIndex - 1); else updateResultView(finalizedSubmissions.length - 1); }

document.getElementById("resNext").addEventListener("click", nextResSlide);
document.getElementById("resPrev").addEventListener("click", prevResSlide);

function startResAutoSlide() {
  clearInterval(resAutoSlideTimer);
  resAutoSlideTimer = setInterval(() => { if (!isResInteracting) nextResSlide(); }, 6000);
}

const resViewport = document.getElementById("resultsViewport");
const resArrL = document.getElementById("resPrev");
const resArrR = document.getElementById("resNext");

resViewport.addEventListener("mouseenter", () => { resArrL.classList.remove("hidden"); resArrR.classList.remove("hidden"); isResInteracting = true; });
resViewport.addEventListener("mouseleave", () => { resArrL.classList.add("hidden"); resArrR.classList.add("hidden"); isResInteracting = false; });
resViewport.addEventListener("touchstart", () => { resArrL.classList.remove("hidden"); resArrR.classList.remove("hidden"); isResInteracting = true; }, {passive: true});
resViewport.addEventListener("touchend", () => { setTimeout(()=> {isResInteracting = false;}, 2000); });

document.getElementById("downloadFinalBtn").addEventListener("click", async () => {
  const currentData = finalizedSubmissions[currentResIndex];
  showToast("Preparing high quality download...");
  try {
    const response = await fetch(currentData.finalImageUrl);
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${currentData.firstName}_${currentData.lastName}_Final.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    showToast("Direct download blocked by browser. Opening in new tab.");
    window.open(currentData.finalImageUrl, "_blank");
  }
});

function listenToComments(submissionId) {
  if (activeUnsubComments) activeUnsubComments();
  liveCommentsStream.innerHTML = ""; 
  
  const commentsRef = collection(db, "submissions", submissionId, "comments");
  activeUnsubComments = onSnapshot(query(commentsRef, orderBy("timestamp", "desc")), (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type === "added") {
        const c = change.doc.data();
        const bubble = document.createElement("div");
        bubble.className = "live-comment-bubble";
        bubble.innerHTML = `<b>${c.name}:</b> ${c.text}`;
        liveCommentsStream.appendChild(bubble);
        
        setTimeout(() => { if (bubble.parentNode) bubble.remove(); }, 3900);
      }
    });
  });
}

const commentInputOverlay = document.getElementById("commentInputOverlay");
document.getElementById("triggerCommentBtn").addEventListener("click", () => {
  isResInteracting = true;
  commentInputOverlay.classList.remove("hidden");
});
document.getElementById("cancelCommentBtn").addEventListener("click", () => {
  isResInteracting = false;
  commentInputOverlay.classList.add("hidden");
});
document.getElementById("submitCommentBtn").addEventListener("click", async () => {
  const name = document.getElementById("commentRealName").value.trim();
  const text = document.getElementById("commentText").value.trim();
  
  if (!name || !text) { showToast("Please enter your real name and a comment."); return; }
  
  const currentData = finalizedSubmissions[currentResIndex];
  await addDoc(collection(db, "submissions", currentData.id, "comments"), {
    name: name,
    text: text,
    timestamp: serverTimestamp()
  });
  
  document.getElementById("commentText").value = "";
  commentInputOverlay.classList.add("hidden");
  isResInteracting = false;
});