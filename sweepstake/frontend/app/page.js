"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import contractAbi from "../constants/EthRewardPool.json";

export default function Home() {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [joinTimestamp, setJoinTimestamp] = useState(null);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [joinNotice, setJoinNotice] = useState("");
  const [roundCompleteSoundPlayed, setRoundCompleteSoundPlayed] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [roundId, setRoundId] = useState(0);
  const [lastWinner, setLastWinner] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [toast, setToast] = useState(null);
  const [playerStats, setPlayerStats] = useState({ entries: 0, wins: 0, earnings: "0" });
  const [achievements, setAchievements] = useState([]);
  const [topWinners, setTopWinners] = useState([]);
  const [prizePoolHistory, setPrizePoolHistory] = useState([]);
  const [isWinnerAnnounced, setIsWinnerAnnounced] = useState(false);

  const ROUND_DURATION_MS = 10 * 60 * 1000;

  // Get the "Direct Line" URL from your .env.local file
  const alchemyUrl = process.env.NEXT_PUBLIC_ALCHEMY_URL;
  
  // Sepolia Contract Address that must be updated here if redeployed
  const contractAddress = "0x5889c2EE0e033bFa2064C8615F3cDB9fc5307C21";

  // --- CONNECT WALLET ---
  async function connectWallet() {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);
      } catch (err) {
        console.error("User denied account access");
      }
    } else {
      alert("Please install MetaMask!");
    }
  }

  // --- DISCONNECT WALLET ---
  function disconnectWallet() {
    setAccount("");
    setJoinTimestamp(null);
    setTimeLeftMs(0);
    localStorage.removeItem("joinTimestamp");
  }

  // Generate random avatar color for each address
  const getAvatarColor = (address) => {
    const colors = [
      "bg-blue-600",
      "bg-black border border-white",
      "bg-white text-gray-900",
    ];
    const index = parseInt(address.slice(2, 8), 16) % colors.length;
    return colors[index];
  };

  // Get participant initials
  const getInitials = (address) => {
    return address.slice(2, 4).toUpperCase();
  };
 
  async function fetchPoolData() {
    try {
        if (!alchemyUrl) {
            console.error("Missing NEXT_PUBLIC_ALCHEMY_URL in .env.local");
            return;
        }
        const provider = new ethers.JsonRpcProvider(alchemyUrl);
        const contract = new ethers.Contract(contractAddress, contractAbi.abi, provider);
        
        const poolBalance = await provider.getBalance(contractAddress);
        setBalance(ethers.formatEther(poolBalance));
        
        // Fetch participants
        const participantsList = [];
        try {
          let i = 0;
          while (true) {
            const participant = await contract.participants(i);
            participantsList.push(participant);
            i++;
          }
        } catch (err) {
          // Loop breaks when no more participants
        }
        setParticipants(participantsList);
        
        // Fetch round ID
        try {
          const round = await contract.roundId();
          setRoundId(Number(round));
        } catch (err) {
          console.error("Error fetching round ID:", err);
        }
        
        // Fetch last winner if any
        try {
          const round = await contract.roundId();
          if (Number(round) > 1) {
            const winner = await contract.rewardHistory(Number(round) - 1);
            if (winner !== ethers.ZeroAddress) {
              setLastWinner(winner);
            }
          }
        } catch (err) {
          console.error("Error fetching winner:", err);
        }
    } catch (err) {
        console.error("Error fetching balance:", err);
    }
  }

  // --- FORCE METAMASK TO USE ALCHEMY ---
  // Click the "Fix Connection" button to run this
  async function fixConnection() {
    try {
      const chainId = "0x66eee"; // Arbitrum Sepolia Chain ID

      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainId,
            chainName: "Arbitrum Sepolia",
            rpcUrls: [alchemyUrl || "https://sepolia-rollup.arbitrum.io/rpc"], // Forces your private URL
            nativeCurrency: {
              name: "Arbitrum Sepolia Ether",
              symbol: "ETH",
              decimals: 18,
            },
            blockExplorerUrls: ["https://sepolia.arbiscan.io"],
          },
        ],
      });
      alert("Connection Fixed! MetaMask is now using Alchemy.");
      window.location.reload(); 
    } catch (error) {
      console.error("Failed to add network:", error);
      // If it still fails, user likely needs to delete the network manually first
      alert("MetaMask rejected the update. Please delete 'Sepolia' from your MetaMask settings and click this button again.");
    }
  }

  // --- JOIN POOL (Write Transaction) ---
  async function joinPool() {
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractAbi.abi, signer);

      // Get current gas price and add 20% buffer
      const feeData = await provider.getFeeData();
      const maxFeePerGas = feeData.maxFeePerGas 
        ? (feeData.maxFeePerGas * BigInt(120)) / BigInt(100)  // Add 20% buffer
        : null;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas 
        ? (feeData.maxPriorityFeePerGas * BigInt(120)) / BigInt(100)  // Add 20% buffer
        : null;

      // Estimate gas
      const gasEstimate = await contract.joinPool.estimateGas({ value: ethers.parseEther("0.02") });
      const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);  // Add 20% buffer to gas estimate

      // Send transaction with proper gas parameters
      const tx = await contract.joinPool(
        { 
          value: ethers.parseEther("0.02"),
          gasLimit: gasLimit,
          maxFeePerGas: maxFeePerGas,
          maxPriorityFeePerGas: maxPriorityFeePerGas
        }
      );
      console.log("Transaction sent:", tx.hash);
      console.log("View on Arbiscan: https://sepolia.arbiscan.io/tx/" + tx.hash);
      
      await tx.wait();
      const timestamp = Date.now();
      setJoinTimestamp(timestamp);
      localStorage.setItem("joinTimestamp", timestamp.toString());
      setTimeLeftMs(ROUND_DURATION_MS);
      setJoinNotice("You're locked in. The countdown is live.");
      playJoinSound();
      
      // Play trumpet fanfare if this is the first player (round start)
      if (participants.length === 0) {
        setTimeout(() => playRoundStartTrumpet(), 300);
      }
      
      setConfetti(true);
      setTimeout(() => setConfetti(false), 3000);
      
      // Show toast notification with Arbiscan link
      showToast(`🎮 Joined! Your odds: ${getWinOdds()}`, "success");
      
      // Update player stats
      setPlayerStats(prev => ({ ...prev, entries: prev.entries + 1 }));
      
      // Check and award achievements
      setTimeout(() => {
        checkAchievements(participants, true);
      }, 500);
      
      fetchPoolData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.message?.toLowerCase() || err.toString().toLowerCase();
      if (errorMsg.includes("max fee per gas") || errorMsg.includes("base fee")) {
        alert("⚠️ Gas prices are too high. Please try again in a moment when network conditions improve.");
      } else {
        alert("Transaction failed. Check console for details.");
      }
    } finally {
      setLoading(false);
    }
  }

  // --- PICK WINNER (Admin Only) ---
  async function pickWinner() {
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractAbi.abi, signer);

      // Get current gas price and add 20% buffer
      const feeData = await provider.getFeeData();
      const maxFeePerGas = feeData.maxFeePerGas 
        ? (feeData.maxFeePerGas * BigInt(120)) / BigInt(100)  // Add 20% buffer
        : null;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas 
        ? (feeData.maxPriorityFeePerGas * BigInt(120)) / BigInt(100)  // Add 20% buffer
        : null;

      // Estimate gas
      const gasEstimate = await contract.distributeReward.estimateGas();
      const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);  // Add 20% buffer to gas estimate

      const tx = await contract.distributeReward(
        {
          gasLimit: gasLimit,
          maxFeePerGas: maxFeePerGas,
          maxPriorityFeePerGas: maxPriorityFeePerGas
        }
      );
      console.log("Picking winner...", tx.hash);
      console.log("View on Arbiscan: https://sepolia.arbiscan.io/tx/" + tx.hash);
      
      await tx.wait();
      alert("Winner picked! Funds distributed.\n\nView on Arbiscan:\nhttps://sepolia.arbiscan.io/tx/" + tx.hash);
      fetchPoolData();
    } catch (err) {
      console.error("Pick winner error:", err);
      
      const errorMessage = err.message || err.toString();
      
      if (errorMessage.includes("Round not finished") || errorMessage.includes("RoundNotFinished")) {
        alert("⏱️ Wait! The 10-minute round timer isn't up yet.");
      } else if (errorMessage.includes("AccessControl") || errorMessage.includes("unauthorized") || errorMessage.includes("Ownable")) {
        alert("🔒 Only the Admin (Deployer) can pick the winner!");
      } else if (errorMessage.includes("Not enough participants") || errorMessage.includes("NoParticipants")) {
        alert("👥 Not enough participants! Need at least 1 player to pick a winner.");
      } else if (errorMessage.includes("user rejected") || errorMessage.includes("User denied")) {
        alert("❌ Transaction cancelled.");
      } else if (errorMessage.includes("insufficient funds")) {
        alert("💰 Insufficient funds for gas fees.");
      } else if (errorMessage.includes("max fee per gas") || errorMessage.includes("base fee")) {
        alert("⚠️ Gas prices are too high. Please try again in a moment when network conditions improve.");
      } else {
        alert(`❌ Failed: ${errorMessage.substring(0, 100)}`);
      }
    } finally {
      setLoading(false);
    }
  }

  // --- HELPER FUNCTIONS ---
  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const checkAchievements = (currentParticipants, isJoining) => {
    const newAchievements = [];
    
    if (isJoining && currentParticipants.length === 1) {
      newAchievements.push({ id: 1, name: "First Blood", icon: "🔫", desc: "Be the first to join a round" });
    }
    if (currentParticipants.length === 2 && isJoining) {
      newAchievements.push({ id: 2, name: "Duo", icon: "👥", desc: "Play with one other player" });
    }
    if (currentParticipants.length === 5 && isJoining) {
      newAchievements.push({ id: 3, name: "Squad", icon: "🎮", desc: "Get 5 players in one round" });
    }
    if (isJoining && parseFloat(balance) > 1) {
      newAchievements.push({ id: 4, name: "Mega Prize", icon: "💎", desc: "Play in a round with 1+ ETH prize" });
    }
    
    if (newAchievements.length > 0) {
      newAchievements.forEach(achievement => {
        if (!achievements.find(a => a.id === achievement.id)) {
          setAchievements(prev => [...prev, achievement]);
          playAchievementSound();
        }
      });
    }
  };

  const playWinSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime;
      // Triumphant fanfare - extended Victory theme
      const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50, 1174.66]; // C5, E5, G5, C6, G5, C6, D6

      notes.forEach((freq, idx) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);
        gain.gain.setValueAtTime(0.45, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.15 + 0.3);
        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.3);
      });
    } catch (err) {
      console.log("Sound disabled");
    }
  };

  const playAchievementSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime;
      // Sparkling achievement unlock sound - ascending then descending
      const achievementNotes = [1046.50, 1174.66, 1318.51, 1567.98, 1396.91]; // C6, D6, E6, G6, F6
      
      achievementNotes.forEach((freq, idx) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.35, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.2);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.2);
      });
    } catch (err) {
      console.log("Sound disabled");
    }
  };

  const playTickingSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime;
      // Double tick - clock ticking effect
      const tickFrequency = 800; // Medium frequency for clock tick
      
      // First tick
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.frequency.setValueAtTime(tickFrequency, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc1.start(now);
      osc1.stop(now + 0.08);

      // Second tick (slightly different pitch)
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.setValueAtTime(650, now + 0.1);
      gain2.gain.setValueAtTime(0.15, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.18);
    } catch (err) {
      console.log("Ticking sound disabled");
    }
  };

  const getWinOdds = () => {
    if (participants.length === 0) return "0%";
    const odds = (1 / participants.length) * 100;
    return odds.toFixed(1) + "%";
  };

  const getPotentialWinnings = () => {
    if (participants.length === 0) return "0";
    return (parseFloat(balance) / participants.length).toFixed(4);
  };

  useEffect(() => {
    fetchPoolData();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchPoolData, 5000);
    
    // Load timer from localStorage on mount
    const savedTimestamp = localStorage.getItem("joinTimestamp");
    if (savedTimestamp) {
      setJoinTimestamp(parseInt(savedTimestamp));
    }
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!joinTimestamp) return;

    const tick = () => {
      const elapsed = Date.now() - joinTimestamp;
      const remaining = Math.max(ROUND_DURATION_MS - elapsed, 0);
      setTimeLeftMs(remaining);
      
      // Play ticking sound every 3 seconds while countdown is active
      if (remaining > 0 && Math.floor(remaining / 1000) % 3 === 0) {
        playTickingSound();
      }
    };

    tick();
    const timerId = setInterval(tick, 1000);
    return () => clearInterval(timerId);
  }, [joinTimestamp]);

  // Play sound when round completes
  useEffect(() => {
    if (timeLeftMs === 0 && joinTimestamp && !roundCompleteSoundPlayed) {
      playRoundCompleteSound();
      setRoundCompleteSoundPlayed(true);
      // Clear localStorage when round expires
      localStorage.removeItem("joinTimestamp");
    }
  }, [timeLeftMs, joinTimestamp, roundCompleteSoundPlayed]);

  const formatTime = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  // Play completion bell sound
  const playRoundCompleteSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime;
      
      // Dramatic round-end fanfare - longer and more impressive
      const fanfareFreqs = [1046.50, 1318.51, 1567.98, 1046.50, 1046.50, 783.99, 523.25]; // C6, E6, G6, C6, C6, G5, C5
      
      fanfareFreqs.forEach((freq, idx) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.setValueAtTime(freq, now + idx * 0.2);
        gain.gain.setValueAtTime(0.5, now + idx * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.2 + 0.5);
        osc.start(now + idx * 0.2);
        osc.stop(now + idx * 0.2 + 0.5);
      });
    } catch (err) {
      console.log("Sound disabled or not supported");
    }
  };

  // Play join sound effect
  const playJoinSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime;
      
      // Exciting join sound with multiple ascending notes
      const joinNotes = [440, 523.25, 659.25, 783.99]; // A4, C5, E5, G5
      joinNotes.forEach((freq, idx) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.35, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.25);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.25);
      });
    } catch (err) {
      console.log("Sound disabled or not supported");
    }
  };

  const playRoundStartTrumpet = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime;
      // Trumpet fanfare - exciting round start!
      const trumpetNotes = [659.25, 783.99, 1046.50, 783.99, 1046.50, 1174.66, 1318.51]; // E5, G5, C6, G5, C6, D6, E6
      
      trumpetNotes.forEach((freq, idx) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.setValueAtTime(freq, now + idx * 0.18);
        gain.gain.setValueAtTime(0.5, now + idx * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.18 + 0.4);
        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 0.4);
      });
    } catch (err) {
      console.log("Trumpet sound disabled");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-white text-black font-sans relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-300 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-600 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Confetti Effect */}
      {confetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-20px`,
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
                backgroundColor: ['#0080ff', '#00bfff', '#ffffff', '#000000', '#4169e1'][Math.floor(Math.random() * 5)],
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${Math.random() * 2 + 2}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg text-white font-semibold z-40 animate-pulse ${
          toast.type === 'success' ? 'bg-green-500' :
          toast.type === 'error' ? 'bg-red-500' :
          toast.type === 'achievement' ? 'bg-yellow-500' :
          'bg-blue-500'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Achievements Popup */}
      {achievements.length > 0 && (
        <div className="fixed top-20 right-4 z-40 space-y-2 max-h-48 overflow-y-auto">
          {achievements.slice(-3).map((ach, idx) => (
            <div key={idx} className="bg-gradient-to-r from-yellow-400 to-orange-400 p-3 rounded-lg text-black font-bold text-sm animate-bounce"
              style={{ animationDelay: `${idx * 0.1}s` }}>
              <div className="text-lg">{ach.icon} {ach.name}</div>
              <div className="text-xs opacity-90">{ach.desc}</div>
            </div>
          ))}
        </div>
      )}

      <div className="relative z-10 max-w-6xl w-full">
        {/* Header Card */}
        <div className="mb-8 text-center">
          <h1 className="text-6xl md:text-7xl font-black mb-3 text-blue-500">
            EthReward Arena
          </h1>
          <p className="text-xl text-gray-700 font-light tracking-wide">Join the Battle • Win the Prize</p>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            <div className="px-4 py-2 bg-blue-600 rounded-full border border-blue-600 text-white">
              🏆 Round #{roundId}
            </div>
            <div className="px-4 py-2 bg-blue-600 rounded-full border border-blue-600 text-white">
              👥 {participants.length} Player{participants.length !== 1 ? 's' : ''} In
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Participants */}
          <div className="md:col-span-1">
            {/* Wallet Connection Status - Top of Left Column */}
            {account && (
              <div className="mb-4 bg-white p-4 rounded-2xl border-2 border-blue-500">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-1">Connected</div>
                    <div className="text-sm font-mono text-gray-900 truncate">
                      {account.slice(0, 6)}...{account.slice(-6)}
                    </div>
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-all active:scale-95 border border-red-600"
                  >
                    Disconnect
                  </button>
                </div>
                <a
                  href={`https://sepolia.arbiscan.io/address/${contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold rounded-lg transition-all border border-blue-200"
                >
                  <span>🔍</span>
                  <span>View Contract on Arbiscan</span>
                </a>
              </div>
            )}

            <div className="bg-white p-6 rounded-2xl border-2 border-blue-500">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                <span className="text-2xl">👥</span>
                <span>Players ({participants.length})</span>
              </h3>
              
              {participants.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">🎯</div>
                  <p className="text-sm">Be the first to join!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                  {participants.map((participant, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-105 ${
                        participant.toLowerCase() === account.toLowerCase()
                          ? 'bg-blue-600 border-2 border-blue-600 text-white'
                          : 'bg-gray-100 border border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full ${getAvatarColor(participant)} flex items-center justify-center font-bold text-white`}>
                        {getInitials(participant)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono truncate">
                          {participant.toLowerCase() === account.toLowerCase() ? '⭐ You' : `Player ${index + 1}`}
                        </div>
                        <div className={`text-[10px] truncate font-mono ${
                          participant.toLowerCase() === account.toLowerCase() ? 'text-blue-200' : 'text-gray-500'
                        }`}>
                          {participant.slice(0, 10)}...{participant.slice(-8)}
                        </div>
                      </div>
                      <div className="text-xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🎮'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Last Winner */}
            {lastWinner && (
              <div className="mt-4 bg-blue-100 p-4 rounded-2xl border-2 border-blue-500">
                <div className="text-sm font-bold mb-2 flex items-center gap-2 text-gray-900">
                  <span className="text-xl">🏆</span>
                  <span>Last Winner</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full ${getAvatarColor(lastWinner)} flex items-center justify-center font-bold text-sm`}>
                    {getInitials(lastWinner)}
                  </div>
                  <div className="text-xs font-mono truncate text-gray-700">
                    {lastWinner.slice(0, 10)}...{lastWinner.slice(-8)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Main Actions */}
          <div className="md:col-span-2 space-y-6">
            {/* Prize Pool */}
            <div className="bg-white p-8 rounded-2xl border-2 border-blue-500">
              <div className="text-center">
                <p className="text-gray-700 text-sm uppercase tracking-widest mb-2 font-semibold">💰 Total Prize Pool</p>
                <div className="relative inline-block">
                  <p className="text-6xl md:text-7xl font-black text-blue-500 font-mono">
                    {balance}
                  </p>
                </div>
                <p className="text-gray-700 text-lg mt-2 font-semibold">ETH</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-300">
                <div className="text-xs text-gray-600 uppercase mb-1">Round Status</div>
                <div className="text-2xl font-bold text-blue-600">
                  {joinTimestamp ? (timeLeftMs > 0 ? "⏱️ Active" : "✅ Complete") : "🎯 Waiting"}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-2xl border-2 border-green-300">
                <div className="text-xs text-gray-600 uppercase mb-1">Entry Fee</div>
                <div className="text-2xl font-bold text-green-600">0.02 ETH</div>
              </div>
            </div>
            
            {/* Connection & Join */}
            <div className="bg-white p-8 rounded-2xl border-2 border-blue-500">
              {!account ? (
                <button 
                  onClick={connectWallet} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 rounded-xl transition-all active:scale-95 text-xl border border-blue-600"
                >
                  🔗 Connect Wallet to Play
                </button>
              ) : (
                <div className="space-y-4">
                  {/* Game Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-300">
                      <div className="text-2xl font-bold text-blue-600">{getWinOdds()}</div>
                      <div className="text-xs text-gray-600">Win Odds</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center border border-green-300">
                      <div className="text-2xl font-bold text-green-600">{getPotentialWinnings()}</div>
                      <div className="text-xs text-gray-600">If You Win</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg text-center border border-purple-300">
                      <div className="text-2xl font-bold text-purple-600">{participants.length}</div>
                      <div className="text-xs text-gray-600">Players</div>
                    </div>
                  </div>

                  <button 
                    onClick={joinPool} 
                    disabled={loading || !account}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xl border border-blue-600"
                  >
                    {loading ? "⏳ Joining..." : "🎰 Join Round (0.02 ETH)"}
                  </button>

                  {joinTimestamp && (
                    <div className="p-6 rounded-2xl border-2 border-blue-500 bg-blue-50">
                      <div className="flex items-center gap-2 text-blue-600 text-lg font-semibold mb-2">
                        <span className="text-2xl animate-bounce">✅</span>
                        <span>You're In the Game!</span>
                      </div>
                      <p className="text-gray-700 text-sm mb-4">
                        {joinNotice}
                      </p>
                      <div className="mt-4 bg-white p-4 rounded-xl border-2 border-blue-500">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs uppercase tracking-widest text-gray-700">⏱️ Round Timer</div>
                          {timeLeftMs > 0 && (
                            <div className="text-xs text-blue-600">
                              {Math.floor(timeLeftMs / 1000 / 60)}m remaining
                            </div>
                          )}
                        </div>
                        <div className="font-mono text-4xl md:text-5xl text-blue-500 text-center py-2 tracking-wider">
                          {formatTime(timeLeftMs)}
                        </div>
                        {timeLeftMs === 0 && (
                          <p className="text-blue-600 text-sm mt-3 text-center animate-pulse">
                            ⏰ Round Complete! Waiting for winner selection...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Admin Section */}
            <div className={`bg-white p-6 rounded-2xl border-2 ${timeLeftMs === 0 && participants.length > 0 ? 'border-green-500 bg-green-50' : 'border-gray-400'}`}>
              <p className="text-sm text-gray-700 mb-4 font-semibold uppercase tracking-wide flex items-center gap-2">
                <span className="text-xl">⚙️</span>
                <span>Admin Control Panel</span>
              </p>
              
              {timeLeftMs === 0 && participants.length > 0 ? (
                <div>
                  <div className="mb-4 p-3 bg-green-100 border border-green-500 rounded-lg">
                    <div className="text-sm font-bold text-green-700">🎰 Ready to Pick Winner!</div>
                    <div className="text-xs text-green-600 mt-1">{participants.length} player{participants.length !== 1 ? 's' : ''} waiting for results</div>
                  </div>
                  <button 
                    onClick={pickWinner}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-lg border border-green-600 animate-pulse-glow"
                  >
                    {loading ? "⏳ Picking Winner..." : "🎲 Pick Winner & Award Prize"}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={pickWinner}
                  disabled={loading || timeLeftMs > 0}
                  className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-lg border border-gray-900"
                >
                  {loading ? "⏳ Processing..." : "🏆 Pick Winner & Pay Out"}
                </button>
              )}
              
              <p className="text-xs text-gray-600 mt-3 text-center">
                ⏱️ 10-minute cooldown from round start • Admin only
              </p>
            </div>

            {/* Connection Tool */}
            <div className="text-center">
              <button 
                onClick={fixConnection}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-medium border border-blue-600"
              >
                ⚡ Fix MetaMask Connection
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% { 
            transform: translateY(0) rotate(0deg); 
            opacity: 1;
          }
          100% { 
            transform: translateY(100vh) rotate(720deg); 
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(229, 231, 235, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.6);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.9);
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.5); }
          50% { box-shadow: 0 0 40px rgba(34, 197, 94, 0.8); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        @keyframes bounce-in {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
      `}</style>
    </main>
  );
}