const fileInput = document.getElementById("fileInput");
const tagList = document.getElementById("tagList");
const imagesDiv = document.getElementById("images");
const status = document.getElementById("status");

let imageMap = {};
let tagCount = {}; 
let triggerWords = new Set();
let selectedTag = null;
let selectedImage = null;

// 파일 입력이 변경될 때마다 실행되는 이벤트 리스너
// 사용자가 파일을 업로드하면 텍스트 파일은 태그 데이터로, 이미지 파일은 URL로 변환하여 imageMap에 정리
fileInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    imageMap = {};
    tagCount = {};
    triggerWords.clear();

    let imageFileCount = 0;
    let textFileCount = 0;

    for (const file of files) {
        const base = file.name.replace(/\.[^/.]+$/, "");
        if (file.name.endsWith(".txt")) {
            const text = await file.text();
            const tags = text.split(/[,|\n]/).map(t => t.trim()).filter(Boolean);
            imageMap[base] = imageMap[base] || {};
            imageMap[base].tags = tags;
            textFileCount++;
        } else if (file.type.startsWith("image/")) {
            imageMap[base] = imageMap[base] || {};
            imageMap[base].img = URL.createObjectURL(file);
            imageFileCount++;
        }
    }
    
    status.textContent = `이미지 ${imageFileCount}개, 텍스트 ${textFileCount}개 로드됨`;
    recalculateTagCount(); 
    renderAll();
});

// 현재 로드된 전체 데이터(imageMap)를 훑으며 각 태그가 총 몇 번 사용되었는지 다시 계산하여 tagCount 객체를 최신화
function recalculateTagCount() {
    for (let t in tagCount) tagCount[t] = 0;
    for (const key in imageMap) {
        if (imageMap[key].tags) {
            imageMap[key].tags.forEach(t => {
                tagCount[t] = (tagCount[t] || 0) + 1;
            });
        }
    }
}

// 사용자가 입력창에 새로운 태그를 입력했을 때, 이를 시스템에 등록하고 화면상에서 즉시 해당 태그를 찾아갈 수 있도록 제어하는 역할
function addNewTag() {
    const input = document.getElementById("newTagInput");
    const val = input.value.trim();
    
    if (val) {
        if (!tagCount.hasOwnProperty(val)) {
            tagCount[val] = 0;
        }
        
        selectedTag = val;
        selectedImage = null;
        
        input.value = "";
        renderAll();
        scrollToActiveTag();
    }
}

// 선택된 태그가 있는 위치로 사이드바 스크롤을 자동으로 이동
function scrollToActiveTag() {
    setTimeout(() => {
        const activeTagElement = document.querySelector(".tag.active");
        if (activeTagElement) {
            activeTagElement.scrollIntoView({
                block: "center"
            });
        }
    }, 50);
}

function renderAll() {
    renderTags();
    renderImages();
}

function renderTags() {
    tagList.innerHTML = "";

    // 태그 정렬 (트리거 단어 > 빈도수 > 알파벳 순)
    const sortedTags = Object.entries(tagCount).sort((a, b) => {
        if (triggerWords.has(a[0]) && !triggerWords.has(b[0])) return -1;
        if (!triggerWords.has(a[0]) && triggerWords.has(b[0])) return 1;
        return b[1] - a[1] || a[0].localeCompare(b[0]);
    });

    sortedTags.forEach(([tag, count]) => {
        const div = document.createElement("div");
        div.className = `tag ${selectedTag === tag ? 'active' : ''}`;
        
        if (selectedImage) {
            const hasTag = imageMap[selectedImage].tags?.includes(tag);
            if (!hasTag) div.classList.add("dimmed");
        }

        const span = document.createElement("span");
        span.textContent = `${triggerWords.has(tag) ? '⭐ ' : ''}${tag} (${count})`;
        div.appendChild(span);

        const btnContainer = document.createElement("div");
        btnContainer.className = "tag-btns-container";

        if (selectedTag === tag) {
            const triggerBtn = document.createElement("button");
            const isTrigger = triggerWords.has(tag);
            triggerBtn.textContent = "T";
            triggerBtn.className = `opt-btn ${isTrigger ? 'btn-trigger-off' : 'btn-trigger-on'}`;
            triggerBtn.onclick = (e) => { e.stopPropagation(); toggleTrigger(tag); };

            const allAddBtn = document.createElement("button");
            allAddBtn.textContent = "A+";
            allAddBtn.className = "opt-btn btn-bulk-add";
            allAddBtn.onclick = (e) => { e.stopPropagation(); bulkTagAction(tag, 'add'); };

            const allDelBtn = document.createElement("button");
            allDelBtn.textContent = "A-";
            allDelBtn.className = "opt-btn btn-bulk-del";
            allDelBtn.onclick = (e) => { e.stopPropagation(); bulkTagAction(tag, 'remove'); };

            btnContainer.append(triggerBtn, allAddBtn, allDelBtn);
        }

        if (selectedImage) {
            const hasTag = imageMap[selectedImage].tags?.includes(tag);
            const editBtn = document.createElement("button");
            editBtn.className = `opt-btn ${hasTag ? 'btn-del' : 'btn-add'}`;
            editBtn.textContent = hasTag ? "-" : "+";
            editBtn.onclick = (e) => { e.stopPropagation(); toggleTag(selectedImage, tag); };
            btnContainer.appendChild(editBtn);
        }

        div.appendChild(btnContainer);

        div.onclick = () => { 
            if (selectedImage) {
                selectedImage = null;
                selectedTag = tag;
            } else {
                selectedTag = (selectedTag === tag) ? null : tag;
            }
            renderAll();
        };
        tagList.appendChild(div);
    });
}

function renderImages() {
    imagesDiv.innerHTML = "";
    for (const key in imageMap) {
        const item = imageMap[key];
        if (!item.img) continue;

        const card = document.createElement("div");
        card.className = "image-card";
        if (selectedImage === key) card.style.boxShadow = "0 0 0 4px #007bff";
        if (selectedTag && !item.tags?.includes(selectedTag)) card.classList.add("dimmed");

        const img = document.createElement("img");
        img.src = item.img;
        img.onclick = () => { 
            selectedImage = (selectedImage === key) ? null : key; 
            selectedTag = null; 
            renderAll(); 
        };

        if (selectedTag) {
            const hasTag = item.tags?.includes(selectedTag);
            const btn = document.createElement("button");
            btn.className = `edit-btn ${hasTag ? 'btn-del' : 'btn-add'}`;
            btn.textContent = hasTag ? "-" : "+";
            btn.onclick = (e) => { e.stopPropagation(); toggleTag(key, selectedTag); };
            card.appendChild(btn);
        }

        card.appendChild(img);
        imagesDiv.appendChild(card);
    }
}

function toggleTag(imgKey, tag) {
    if (!imageMap[imgKey].tags) imageMap[imgKey].tags = [];
    const idx = imageMap[imgKey].tags.indexOf(tag);
    if (idx > -1) imageMap[imgKey].tags.splice(idx, 1);
    else imageMap[imgKey].tags.push(tag);
    saveAndRefresh();
}

function toggleTrigger(tag) {
    if (triggerWords.has(tag)) {
        if (confirm(`'${tag}' 트리거를 해제하며 모든 이미지에서 삭제하시겠습니까?`)) {
            triggerWords.delete(tag);
            bulkTagAction(tag, 'remove', true);
        }
    } else {
        if (confirm(`'${tag}'를 트리거로 설정하며 모든 이미지에 추가하시겠습니까?`)) {
            triggerWords.add(tag);
            bulkTagAction(tag, 'add', true);
            scrollToActiveTag();
        }
    }
}

function bulkTagAction(tag, action, skipConfirm = false) {
    if (!skipConfirm && !confirm(`모든 이미지에서 '${tag}' 태그를 ${action === 'add' ? '추가' : '삭제'}하시겠습니까?`)) return;
    for (const key in imageMap) {
        if (!imageMap[key].tags) imageMap[key].tags = [];
        const idx = imageMap[key].tags.indexOf(tag);
        if (action === 'add' && idx === -1) imageMap[key].tags.push(tag);
        else if (action === 'remove' && idx > -1) imageMap[key].tags.splice(idx, 1);
    }
    saveAndRefresh();
}

function saveAndRefresh() {
    recalculateTagCount();
    renderAll();
}

async function downloadAllTexts() {
    const zip = new JSZip();
    for (const key in imageMap) {
        let tags = [...(imageMap[key].tags || [])];
        tags.sort((a, b) => {
            if (triggerWords.has(a) && !triggerWords.has(b)) return -1;
            if (!triggerWords.has(a) && triggerWords.has(b)) return 1;
            return tagCount[b] - tagCount[a];
        });
        zip.file(`${key}.txt`, tags.join(", "));
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "refined_dataset.zip";
    a.click();
}
