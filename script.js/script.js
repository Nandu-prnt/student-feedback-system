const pages = document.querySelectorAll(".page");
const navItems = document.querySelectorAll(".nav-item");
const title = document.getElementById("pageTitle");
const titles = {dashboard:"Dashboard",feedback:"Give Feedback",history:"My Feedback",courses:"My Courses",profile:"Profile"};
const courseSelect = document.getElementById("courseSelect");
const progressLabel = document.getElementById("progressLabel");
const progressBar = document.getElementById("progressBar");

function showPage(id){
  pages.forEach(p => p.classList.toggle("active", p.id === id));
  navItems.forEach(n => n.classList.toggle("active", n.dataset.page === id));
  title.textContent = titles[id] || "Dashboard";
  document.getElementById("sidebar").classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
}
navItems.forEach(n => n.addEventListener("click",()=>showPage(n.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>{
  if(b.dataset.course) courseSelect.value = b.dataset.course;
  showPage(b.dataset.go);
}));
document.getElementById("menuBtn").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));

document.querySelectorAll(".rating-group").forEach(group=>{
  for(let i=1;i<=10;i++){
    const btn=document.createElement("button");
    btn.textContent=i;
    btn.type="button";
    btn.addEventListener("click",()=>{
      group.querySelectorAll("button").forEach(x=>x.classList.remove("selected"));
      btn.classList.add("selected");
      updateProgress();
    });
    group.appendChild(btn);
  }
});

function updateProgress(){
  const answered = document.querySelectorAll(".rating-group .selected").length;
  progressLabel.textContent = `${answered} of 5 answered`;
  progressBar.style.width = `${answered * 20}%`;
}

function toast(message){
  const t=document.getElementById("toast");
  t.textContent=message;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2800);
}

document.getElementById("submitFeedback").addEventListener("click",()=>{
  const groups=[...document.querySelectorAll(".rating-group")];
  if(groups.some(g=>!g.querySelector(".selected"))){
    toast("Please rate all five questions.");
    return;
  }
  const course=document.getElementById("courseSelect").value.split(" — ")[0];
  const ratings=groups.map(g=>Number(g.querySelector(".selected").textContent));
  const avg=(ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1);
  const row=document.createElement("tr");
  row.innerHTML=`<td>${course}</td><td>Faculty</td><td>${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</td><td><b>${avg}/10</b></td><td><span class="badge green">Submitted</span></td>`;
  document.getElementById("historyEmpty")?.remove();
  document.getElementById("historyBody").prepend(row);
  document.getElementById("recentEmpty")?.remove();
  const activity = document.createElement("div");
  activity.className = "activity";
  activity.innerHTML = `<span class="dot"></span><div><strong>${course}</strong><p>Submitted just now</p></div><span class="rating">${avg}/10</span>`;
  document.querySelector("#dashboard .panel:nth-child(2)").appendChild(activity);
  const count=document.getElementById("feedbackCount");
  count.textContent=Number(count.textContent)+1;
  document.querySelectorAll(".rating-group button").forEach(x=>x.classList.remove("selected"));
  updateProgress();
  document.getElementById("comment").value="";
  document.getElementById("anonymous").checked=false;
  toast("Feedback submitted successfully ✓");
  setTimeout(()=>showPage("history"),700);
});

document.getElementById("logoutBtn").addEventListener("click",()=>{
  toast("Demo logout — connect this to your backend later.");
});
