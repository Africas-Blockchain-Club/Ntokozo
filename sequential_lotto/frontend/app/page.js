'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACT_ADDRESS, CONTRACT_ABI, NETWORK_CONFIG } from '../constants'

export default function Home() {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [contract, setContract] = useState(null)
  const [userAddress, setUserAddress] = useState('')
  const [balance, setBalance] = useState('0')
  const [selectedNumbers, setSelectedNumbers] = useState([])
  const [prizePool, setPrizePool] = useState('0')
  const [nextDraw, setNextDraw] = useState('Loading...')
  const [winningNumbers, setWinningNumbers] = useState([0, 0, 0, 0, 0, 0, 0])
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  useEffect(() => {
    checkWalletConnection()
  }, [])

  useEffect(() => {
    if (contract) {
      loadLotteryInfo()
      const interval = setInterval(loadLotteryInfo, 30000)
      return () => clearInterval(interval)
    }
  }, [contract])

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts.length > 0) {
        await connectWallet()
      }
    }
  }

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        showToast('Please install MetaMask!', 'error')
        return
      }

      setLoading(true)
      setLoadingText('Connecting wallet...')

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const address = accounts[0]

      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      if (chainId !== NETWORK_CONFIG.chainId) {
        await switchNetwork()
      }

      const web3Provider = new ethers.BrowserProvider(window.ethereum)
      const web3Signer = await web3Provider.getSigner()
      const lottoContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, web3Signer)

      setProvider(web3Provider)
      setSigner(web3Signer)
      setContract(lottoContract)
      setUserAddress(address)

      const bal = await web3Provider.getBalance(address)
      setBalance(ethers.formatEther(bal))

      showToast('Wallet connected!', 'success')
      setLoading(false)

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', () => window.location.reload())

    } catch (error) {
      console.error('Error connecting wallet:', error)
      showToast('Failed to connect wallet', 'error')
      setLoading(false)
    }
  }

  const switchNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NETWORK_CONFIG.chainId }],
      })
    } catch (error) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [NETWORK_CONFIG],
        })
      }
    }
  }

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      window.location.reload()
    } else {
      setUserAddress(accounts[0])
    }
  }

  const loadLotteryInfo = async () => {
    try {
      if (!provider || !contract) return

      try {
        const contractBalance = await provider.getBalance(CONTRACT_ADDRESS)
        setPrizePool(ethers.formatEther(contractBalance))
      } catch (error) {
        console.error('Error getting contract balance:', error)
        setPrizePool('Error')
      }

      try {
        const lastDrawTimestamp = await contract.lastDrawTimestamp()
        const interval = await contract.interval()
        const nextDrawTime = (Number(lastDrawTimestamp) + Number(interval)) * 1000
        const now = Date.now()

        if (nextDrawTime > now) {
          const timeLeft = nextDrawTime - now
          const hours = Math.floor(timeLeft / (1000 * 60 * 60))
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
          setNextDraw(`${hours}h ${minutes}m`)
        } else {
          setNextDraw('Ready to draw!')
        }
      } catch (error) {
        console.error('Error getting draw info:', error)
        setNextDraw('Error loading')
      }

      try {
        const nums = []
        for (let i = 0; i < 7; i++) {
          const num = await contract.lastWinningNumbers(i)
          nums.push(Number(num))
        }
        setWinningNumbers(nums)
      } catch (error) {
        console.error('Error getting winning numbers:', error)
        setWinningNumbers([0, 0, 0, 0, 0, 0, 0])
      }

    } catch (error) {
      console.error('Error loading lottery info:', error)
    }
  }

  const selectNumber = (number) => {
    if (selectedNumbers.includes(number)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== number))
    } else if (selectedNumbers.length < 7) {
      setSelectedNumbers([...selectedNumbers, number])
    } else {
      showToast('You can only select 7 numbers!', 'error')
    }
  }

  const quickPick = () => {
    const available = Array.from({ length: 49 }, (_, i) => i + 1)
    const picked = []
    for (let i = 0; i < 7; i++) {
      const randomIndex = Math.floor(Math.random() * available.length)
      picked.push(available[randomIndex])
      available.splice(randomIndex, 1)
    }
    setSelectedNumbers(picked)
    showToast('Random numbers selected!', 'info')
  }

  const clearSelection = () => {
    setSelectedNumbers([])
  }

  const buyTicket = async () => {
    if (!contract) {
      showToast('Please connect your wallet first!', 'error')
      return
    }

    if (selectedNumbers.length !== 7) {
      showToast('Please select exactly 7 numbers!', 'error')
      return
    }

    try {
      setLoading(true)
      setLoadingText('Buying ticket...')

      const tx = await contract.buyTicket(selectedNumbers, {
                value: ethers.parseEther('0.0000001')
            })

      setLoadingText('Waiting for confirmation...')
      await tx.wait()

      showToast('Ticket purchased successfully! 🎉', 'success')
      setSelectedNumbers([])
      
      const bal = await provider.getBalance(userAddress)
      setBalance(ethers.formatEther(bal))
      await loadLotteryInfo()

    } catch (error) {
      console.error('Error buying ticket:', error)
      if (error.code === 4001) {
        showToast('Transaction cancelled', 'error')
      } else {
        showToast('Failed to buy ticket', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message, type) => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000)
  }

  return (
    <div className="container">
      {/* Header */}
      <header>
        <h1>🎰 NtoLotto</h1>
        <p className="subtitle">Pick 7 numbers (1-49) and win sequential matches!</p>
        <div id="walletSection">
          {!userAddress ? (
            <button onClick={connectWallet} className="btn-primary">
              Connect Wallet
            </button>
          ) : (
            <div className="account-info">
              <span className="account-address">
                {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
              </span>
              <span className="account-balance">
                {parseFloat(balance).toFixed(4)} ETH
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="main-content">
        {/* Lottery Info Card */}
        <div className="card info-card">
          <h2>📊 Lottery Info</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Ticket Price:</span>
              <span className="value">0.0000001 ETH</span>
            </div>
            <div className="info-item">
              <span className="label">Prize Pool:</span>
              <span className="value">{parseFloat(prizePool).toFixed(4)} ETH</span>
            </div>
            <div className="info-item">
              <span className="label">Active Tickets:</span>
              <span className="value">N/A</span>
            </div>
            <div className="info-item">
              <span className="label">Next Draw:</span>
              <span className="value">{nextDraw}</span>
            </div>
          </div>
        </div>

        {/* Number Selection Card */}
        <div className="card">
          <h2>🎫 Buy Your Ticket</h2>
          <p className="instruction">Select 7 numbers from 1 to 49:</p>

          <div className="selected-numbers">
            {[0, 1, 2, 3, 4, 5, 6].map(index => (
              <div
                key={index}
                className={`number-slot ${selectedNumbers[index] ? 'filled' : ''}`}
              >
                {selectedNumbers[index] || '?'}
              </div>
            ))}
          </div>

          <div className="number-grid">
            {Array.from({ length: 49 }, (_, i) => i + 1).map(num => (
              <button
                key={num}
                onClick={() => selectNumber(num)}
                className={`number-btn ${selectedNumbers.includes(num) ? 'selected' : ''}`}
              >
                {num}
              </button>
            ))}
          </div>

          <div className="action-buttons">
            <button onClick={quickPick} className="btn-secondary">
              🎲 Quick Pick
            </button>
            <button onClick={clearSelection} className="btn-secondary">
              🔄 Clear
            </button>
            <button
              onClick={buyTicket}
              className="btn-primary"
              disabled={selectedNumbers.length !== 7}
            >
              Buy Ticket (0.0000001 ETH)
            </button>
          </div>
        </div>

        {/* Last Winning Numbers Card */}
        <div className="card">
          <h2>🏆 Last Winning Numbers</h2>
          <div className="winning-numbers">
            {winningNumbers.map((num, index) => (
              <div key={index} className="winning-number">
                {num > 0 ? num : '?'}
              </div>
            ))}
          </div>
        </div>

        {/* Prize Structure Card */}
        <div className="card">
          <h2>💰 Prize Structure</h2>
          <table className="prize-table">
            <thead>
              <tr>
                <th>Sequential Matches</th>
                <th>Prize %</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>7 Numbers</td><td>30%</td></tr>
              <tr><td>5 or 6 Numbers</td><td>20%</td></tr>
              <tr><td>4 Numbers</td><td>15%</td></tr>
              <tr><td>3 Numbers</td><td>10%</td></tr>
              <tr><td>2 Numbers</td><td>5%</td></tr>
            </tbody>
          </table>
          <p className="note">⚠️ Numbers must match sequentially from the start!</p>
        </div>
      </div>

      {/* Footer */}
      <footer>
        <p>Contract Address: <span id="contractAddress">{CONTRACT_ADDRESS}</span></p>
        <p>Network: Sepolia Testnet</p>
      </footer>

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p className="loading-text">{loadingText}</p>
        </div>
      )}

      {/* Toast Notifications */}
      {toast.show && (
        <div className={`toast ${toast.type} show`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
