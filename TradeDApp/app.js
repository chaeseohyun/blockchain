let web3, account, contract;
let isConnected = false;
let hasName = false;
let currentDealId = 2;
let dealCreated = false;
let depositedDone = false;
let shippedDone = false;
let completedDone = false;

const contractAddress = "0xab7d89A7052EB1B50A988e3586d0356cceD5028C";
const SELLER_ADDRESS = "0x7E412f5A10e4A85e9beAD851e1bA25Eb6f882fd1";

const contractABI = [
  {"inputs":[{"internalType":"string","name":"_name","type":"string"}],"name":"setName","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getName","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"createToken","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"checkBal","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"string","name":"_secret","type":"string"}],"name":"getHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"pure","type":"function"},
  {"inputs":[{"internalType":"address","name":"_seller","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"bytes32","name":"_secretHash","type":"bytes32"}],"name":"createDeal","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_dealId","type":"uint256"}],"name":"deposit","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_dealId","type":"uint256"}],"name":"shipped","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_dealId","type":"uint256"},{"internalType":"string","name":"_secret","type":"string"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_dealId","type":"uint256"},{"internalType":"string","name":"_secret","type":"string"}],"name":"confirmReceived","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_dealId","type":"uint256"}],"name":"getDeal","outputs":[{"internalType":"address","name":"buyer","type":"address"},{"internalType":"string","name":"buyerName","type":"string"},{"internalType":"address","name":"seller","type":"address"},{"internalType":"string","name":"sellerName","type":"string"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"bytes32","name":"secretHash","type":"bytes32"},{"internalType":"bool","name":"deposited","type":"bool"},{"internalType":"bool","name":"shipped","type":"bool"},{"internalType":"bool","name":"completed","type":"bool"}],"stateMutability":"view","type":"function"}
];

function show(id,title){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.getElementById("stageTitle").innerText = title;
}

function setBadge(id,text,type){
  const el=document.getElementById(id);
  el.innerText=text;
  el.className="badge "+type;
}

function updateAllStatus(){
  let text="판매중", type="wait";
  if(depositedDone){text="거래 대기 중";type="wait";}
  if(shippedDone){text="발송 완료";type="done";}
  if(completedDone){text="구매완료";type="sold";}

  ["homeProductStatus","detailProductStatus","myProductStatus","sellerDetailStatus","menuProductStatus"].forEach(id=>{
    if(document.getElementById(id)) setBadge(id,text,type);
  });
}

function toggleMenu(){document.getElementById("menuBox").classList.toggle("show");}
function showMenu(){document.getElementById("productMenu").style.display=(isConnected&&hasName)?"block":"none";}

async function connectWallet(){
  if(!window.ethereum){
    alert("MetaMask가 필요합니다.");
    return;
  }

  try {
    web3 = new Web3(window.ethereum);

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });

    account = accounts[0];
    contract = new web3.eth.Contract(contractABI, contractAddress);
    isConnected = true;

    document.getElementById("currentAccount").innerText = account;

    show("nameRegister", "사용자 이름 등록");

    try {
      await refreshName();
    } catch (e) {
      console.log("이름 조회 실패:", e);
      document.getElementById("currentName").innerText = "등록 안 됨";
      hasName = false;
    }

  } catch (e) {
    console.log(e);
    alert("MetaMask 연결 중 오류가 발생했습니다.");
  }
}

async function refreshName(){
  const name=await contract.methods.getName(account).call();
  document.getElementById("currentName").innerText=name||"등록 안 됨";
  hasName=!!name;
  showMenu();
}

async function setName(){
  if(!isConnected){
    alert("먼저 MetaMask를 연결하세요.");
    return;
  }

  const name = document.getElementById("nameInput").value.trim();

  if(!name){
    alert("이름을 입력하세요.");
    return;
  }

  try{
    await contract.methods.setName(name).send({from:account});

    hasName = true;
    document.getElementById("currentName").innerText = name;
    document.getElementById("nameMsg").innerText = "이름 등록 완료";

    showMenu();
    show("home","상품 목록");
    updateAllStatus();

  }catch(e){
    console.log(e);
    alert("이름 등록 트랜잭션이 실패했거나 취소되었습니다.");
  }
}

function goHome(){
  if(!isConnected||!hasName){alert("로그인과 이름 등록이 필요합니다.");return;}
  show("home","상품 목록");
  updateAllStatus();
}

function goProductDetail(){show("productDetail","상품 정보");updateAllStatus();}
function goPurchaseConfirm(){
  if(completedDone){alert("이미 구매 완료된 상품입니다.");return;}
  show("purchaseConfirm","구매 확인");
}

async function createToken(){
  const amount=document.getElementById("tokenAmount").value.trim();
  if(!amount){alert("토큰 수량을 입력하세요.");return;}
  await contract.methods.createToken(amount).send({from:account});
  await checkBal();
}

async function checkBal(){
  try{
    console.log("현재 계정:", account);
    console.log("컨트랙트 주소:", contractAddress);
    console.log("네트워크 ID:", await web3.eth.net.getId());
    console.log("컨트랙트 코드:", await web3.eth.getCode(contractAddress));

    const bal = await contract.methods.checkBal().call({from:account});
    document.getElementById("myBalance").innerText = bal;
  }catch(e){
    console.log("잔액 확인 실패:", e);
    alert("잔액 확인 실패: F12 Console을 확인하세요.");
  }
}

async function getHash(){
  const secret=document.getElementById("secretInput").value.trim();

  if(!secret){
    alert("secret을 입력하세요.");
    return;
  }

  await contract.methods.getHash(secret).call();

  document.getElementById("hashResult").innerHTML =
  "<span style='color:green;font-weight:bold'>✓ 입력 완료!</span>";
}

async function purchaseProduct(){
  const seller=SELLER_ADDRESS;
  const secret=document.getElementById("secretInput").value.trim();
  if(!secret){alert("secret이 필요합니다.");return;}

  const hash=await contract.methods.getHash(secret).call();
  await contract.methods.createDeal(seller,50,hash).send({from:account});
  await contract.methods.deposit(currentDealId).send({from:account});

  dealCreated=true;
  depositedDone=true;
  updateAllStatus();

  show("buyerWaiting","판매자 확인 대기");
}

async function loadDeal(){
  try{
    const d=await contract.methods.getDeal(currentDealId).call();
    dealCreated=d.buyer!="0x0000000000000000000000000000000000000000";
    depositedDone=d.deposited;
    shippedDone=d.shipped;
    completedDone=d.completed;
    updateAllStatus();
    return d;
  }catch(e){console.log(e);return null;}
}

async function loadDealAndMoveBuyer(){
  const d=await loadDeal();
  if(!d||!d.deposited){
    document.getElementById("buyerWaitingTitle").innerText="판매자가 아직 확인하지 않았습니다.";
    document.getElementById("buyerWaitingText").innerText="판매자가 발송 완료 버튼을 누르면 다음 단계로 진행할 수 있습니다.";
    return;
  }
  if(d.shipped&&!d.completed){
    show("buyerReceived","상품 발송 완료");
  }else if(d.completed){
    await showComplete();
  }else{
    document.getElementById("buyerWaitingTitle").innerText="판매자가 아직 확인하지 않았습니다.";
    document.getElementById("buyerWaitingText").innerText="판매자가 발송 완료 버튼을 누르면 다음 단계로 진행할 수 있습니다.";
  }
}

async function confirmReceived(){
  const secret=document.getElementById("receiveSecret").value.trim();
  if(!secret){alert("secret을 입력하세요.");return;}
  await contract.methods.confirmReceived(currentDealId,secret).send({from:account});
  completedDone=true;
  updateAllStatus();
  await showComplete();
}

function openMyProducts(){
  if(!isConnected||!hasName){alert("로그인과 이름 등록이 필요합니다.");return;}
  document.getElementById("menuBox").classList.remove("show");
  show("myProducts","내 상품 목록");
  updateAllStatus();
}

async function openMyTrades(){
  if(!isConnected || !hasName){
    alert("로그인과 이름 등록이 필요합니다.");
    return;
  }

  document.getElementById("menuBox").classList.remove("show");
  show("myTrades", "나의 거래");

  const d = await loadDeal();

  if(!d || d.buyer === "0x0000000000000000000000000000000000000000"){
    document.getElementById("myTradeBox").innerHTML =
      "현재 진행 중인 구매 거래가 없습니다.";
    return;
  }

  if(d.buyer.toLowerCase() !== account.toLowerCase()){
    document.getElementById("myTradeBox").innerHTML =
      "현재 계정으로 진행 중인 구매 거래가 없습니다.";
    return;
  }

  let statusText = "거래 대기 중";
  let actionButton = "";

  if(d.shipped && !d.completed){
    statusText = "발송 완료";
    actionButton =
      `<button class="green" onclick="show('buyerReceived','상품 발송 완료')">수령 완료하러 가기</button>`;
  }

  if(d.completed){
    statusText = "구매완료";
    actionButton =
      `<button class="green" onclick="showComplete()">거래 완료 화면</button>`;
  }

  document.getElementById("myTradeBox").innerHTML =
    `<p><b>상품명:</b> 중고 노트북</p>
     <p><b>가격:</b> ${d.amount} Token</p>
     <p><b>판매자:</b> ${d.sellerName || "판매자"}</p>
     <p class="small">${d.seller}</p>
     <p><b>상태:</b> ${statusText}</p>
     ${actionButton}`;
}

async function openBalance(){
  if(!isConnected || !hasName){
    alert("로그인과 이름 등록이 필요합니다.");
    return;
  }

  document.getElementById("menuBox").classList.remove("show");
  show("balancePage", "내 잔액 확인");

  document.getElementById("balanceAccount").innerText = account;

  try{
    const bal = await contract.methods.checkBal().call({from: account});
    document.getElementById("menuBalance").innerText = bal;
  }catch(e){
    console.log("잔액 확인 실패:", e);
    document.getElementById("menuBalance").innerText = "확인 실패";
  }
}

function goMyProduct(){
  document.getElementById("menuBox").classList.remove("show");
  show("myProductDetail","내 상품 정보");
  sellerRefresh();
}

async function sellerRefresh(){
  const d=await loadDeal();

  if(!d||!d.deposited){
    document.getElementById("sellerActionBox").innerHTML="아직 구매 요청이 없습니다.";
    return;
  }

  if(d.deposited&&!d.shipped){
    document.getElementById("sellerActionBox").innerHTML=
      "상품 상태가 <b>거래 대기 중</b>입니다.<br><button class='green' onclick='shipProduct()'>발송확인</button>";
    return;
  }

  if(d.shipped&&!d.completed){
    document.getElementById("sellerActionBox").innerHTML=
      "발송 완료 상태입니다. 구매자의 수령 완료를 기다리고 있습니다.";
    return;
  }

  if(d.completed){
    document.getElementById("sellerActionBox").innerHTML=
      "거래가 완료되었습니다. 판매자에게 금액이 지급되었습니다.<br><button class='green' onclick='showComplete()'>거래 완료 화면</button>";
  }
}

async function shipProduct(){
  await contract.methods.shipped(currentDealId).send({from:account});
  shippedDone=true;
  updateAllStatus();
  sellerRefresh();
}

async function showComplete(){
  const d=await loadDeal();
  document.getElementById("completeStatusBox").innerHTML=
    `<p><b>구매자:</b> ${d.buyerName}</p>
     <p class="small">${d.buyer}</p>
     <p><b>판매자:</b> ${d.sellerName}</p>
     <p class="small">${d.seller}</p>
     <p><b>거래 금액:</b> ${d.amount} Token</p>
     <p><b>상태:</b> 구매완료</p>`;
  show("complete","거래 완료");
}

if(window.ethereum){
  window.ethereum.on("accountsChanged",async function(accounts){
    account=accounts[0];
    document.getElementById("currentAccount").innerText=account;
    await refreshName();
    if(!hasName){ show("nameRegister","사용자 이름 등록"); }
  });
}
