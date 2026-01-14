'use client'

import { useState, useEffect } from 'react'
import { useWallet, ARC_TESTNET_CONFIG } from '@/hooks/use-wallet'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Loader2, CheckCircle2, XCircle, Calendar, Rocket } from 'lucide-react'
import { Contract } from 'ethers'
import { NFT_CONTRACT_CONFIG, isContractDeployed } from '@/lib/contract-config'

type MintState = 'idle' | 'checking' | 'pending' | 'success' | 'error'

export function DailyMintPanel() {
  const { address, isConnected, chainId, signer, switchToArcTestnet } = useWallet()
  const [wishText, setWishText] = useState('')
  const [receiverAddress, setReceiverAddress] = useState('')
  const [mintState, setMintState] = useState<MintState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [txHash, setTxHash] = useState('')
  const [hasMintedToday, setHasMintedToday] = useState(false)
  const [streak, setStreak] = useState(0)
  const [timeUntilReset, setTimeUntilReset] = useState('')
  const [isCheckingContract, setIsCheckingContract] = useState(false)

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const dateKey = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  const isOnArcTestnet = chainId === ARC_TESTNET_CONFIG.chainId

  useEffect(() => {
    if (address && !receiverAddress) {
      setReceiverAddress(address)
    }
  }, [address, receiverAddress])

  useEffect(() => {
    const checkMintStatus = async () => {
      if (!signer || !address || !isOnArcTestnet) {
        console.log('[v0] Skipping mint check - missing requirements:', { signer: !!signer, address, isOnArcTestnet })
        return
      }

      if (!isContractDeployed()) {
        console.log('[v0] Contract not deployed, skipping mint status check')
        return
      }

      setIsCheckingContract(true)

      try {
        console.log('[v0] Checking mint status for address:', address)
        const contract = new Contract(NFT_CONTRACT_CONFIG.address, NFT_CONTRACT_CONFIG.abi, signer)
        
        const minted = await contract.hasMintedToday(address, dateKey)
        setHasMintedToday(minted)
        console.log('[v0] Mint status checked successfully:', minted)

        const now = new Date()
        const tomorrow = new Date(now)
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
        tomorrow.setUTCHours(0, 0, 0, 0)
        const diff = tomorrow.getTime() - now.getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        setTimeUntilReset(`${hours}h ${minutes}m`)
        
        setIsCheckingContract(false)
      } catch (error: any) {
        console.error('[v0] Error checking mint status:', error)
        setIsCheckingContract(false)
      }
    }

    checkMintStatus()
    const interval = setInterval(checkMintStatus, 300000) // Check every 5 minutes
    return () => clearInterval(interval)
  }, [signer, address, dateKey, isOnArcTestnet])

  const handleMint = async () => {
    if (!signer || !isConnected || !wishText.trim() || !receiverAddress) return

    setMintState('checking')
    setErrorMessage('')
    setTxHash('')

    try {
      if (!isOnArcTestnet) {
        setErrorMessage('Please switch to Arc Testnet before minting')
        setMintState('error')
        return
      }

      if (wishText.length > 300) {
        setErrorMessage('Wish text must be 300 characters or less')
        setMintState('error')
        return
      }

      if (!receiverAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        setErrorMessage('Invalid receiver address')
        setMintState('error')
        return
      }

      const contract = new Contract(NFT_CONTRACT_CONFIG.address, NFT_CONTRACT_CONFIG.abi, signer)

      setMintState('pending')

      const tx = await contract.mintWish(receiverAddress, wishText, dateKey)
      setTxHash(tx.hash)

      await tx.wait()

      setMintState('success')
      setHasMintedToday(true)
      setWishText('')
      setStreak((prev) => prev + 1)
    } catch (error: any) {
      console.error('[v0] Mint error:', error)
      setErrorMessage(error.message || 'Failed to mint NFT')
      setMintState('error')
    }
  }

  if (!isContractDeployed()) {
    return (
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Rocket className="h-5 w-5" />
            Deploy Your Contract First
          </CardTitle>
          <CardDescription className="text-blue-700">
            Before you can start minting daily wishes, deploy the smart contract to Arc Testnet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-white/50">
            <AlertDescription className="space-y-4 text-sm text-gray-700">
              <div>
                <strong className="text-blue-900">Step 1: Deploy the Contract</strong>
                <ol className="mt-2 list-inside list-decimal space-y-1 text-gray-600">
                  <li>Open <code className="rounded bg-gray-100 px-1 text-xs">lib/contract-example.sol</code></li>
                  <li>Deploy it to Arc Testnet using Remix or Hardhat</li>
                  <li>Copy the deployed contract address</li>
                </ol>
              </div>
              <div>
                <strong className="text-blue-900">Step 2: Update Configuration</strong>
                <ol className="mt-2 list-inside list-decimal space-y-1 text-gray-600">
                  <li>Open <code className="rounded bg-gray-100 px-1 text-xs">lib/contract-config.ts</code></li>
                  <li>Replace the placeholder address with your contract address</li>
                  <li>Save and refresh the page</li>
                </ol>
              </div>
              <div className="rounded border-l-4 border-amber-400 bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-900">
                  💡 Need testnet USDC? Get some from the Arc Testnet faucet before deploying!
                </p>
              </div>
            </AlertDescription>
          </Alert>
          <div className="rounded-lg bg-white/50 p-4 text-sm">
            <p className="font-medium text-gray-900">Arc Testnet Details:</p>
            <ul className="mt-2 space-y-1 text-gray-600">
              <li>Chain ID: {ARC_TESTNET_CONFIG.chainId}</li>
              <li>RPC: {ARC_TESTNET_CONFIG.rpcUrl}</li>
              <li>Explorer: {ARC_TESTNET_CONFIG.blockExplorer}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isConnected && !isOnArcTestnet) {
    return (
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-rose-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <AlertTriangle className="h-5 w-5" />
            Wrong Network
          </CardTitle>
          <CardDescription className="text-orange-700">
            Please switch to Arc Testnet to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-white/50 p-4 text-sm">
            <p className="font-medium text-gray-900">Arc Testnet Details:</p>
            <ul className="mt-2 space-y-1 text-gray-600">
              <li>Chain ID: {ARC_TESTNET_CONFIG.chainId}</li>
              <li>RPC: {ARC_TESTNET_CONFIG.rpcUrl}</li>
              <li>Gas Token: USDC</li>
            </ul>
          </div>
          <Button
            onClick={switchToArcTestnet}
            className="w-full bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:from-rose-600 hover:to-orange-600"
          >
            Switch to Arc Testnet
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isConnected && isOnArcTestnet && isCheckingContract) {
    return (
      <Card className="border-rose-200 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-gray-900">Today's Wish</CardTitle>
          <CardDescription className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            {currentDate}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-rose-500" />
            <p className="mt-4 text-sm text-gray-600">Connecting to Arc Testnet contract...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (hasMintedToday && isConnected) {
    return (
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-900">
            <CheckCircle2 className="h-5 w-5" />
            Already Minted Today
          </CardTitle>
          <CardDescription className="text-emerald-700">
            You've already minted today's wish on Arc Testnet. Come back tomorrow 💌
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-white/50 p-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Next mint available in</p>
              <p className="text-2xl font-bold text-gray-900">{timeUntilReset}</p>
            </div>
            <Calendar className="h-8 w-8 text-emerald-500" />
          </div>
          {streak > 0 && (
            <div className="rounded-lg border-2 border-emerald-200 bg-white p-4 text-center">
              <p className="text-sm font-medium text-gray-600">Current Streak</p>
              <p className="text-3xl font-bold text-emerald-600">{streak} days 🔥</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-rose-200 bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl text-gray-900">Today's Wish</CardTitle>
        <CardDescription className="flex items-center gap-2 text-gray-600">
          <Calendar className="h-4 w-4" />
          {currentDate}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="wish" className="text-gray-700">
            Your Wish
          </Label>
          <Textarea
            id="wish"
            placeholder="Write your wish for today... (max 300 characters)"
            value={wishText}
            onChange={(e) => setWishText(e.target.value)}
            maxLength={300}
            rows={4}
            className="resize-none border-rose-200 focus:border-rose-400 focus:ring-rose-400"
            disabled={!isConnected || mintState === 'pending'}
          />
          <p className="text-right text-xs text-gray-500">
            {wishText.length}/300 characters
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="receiver" className="text-gray-700">
            Receiver Address
          </Label>
          <Input
            id="receiver"
            type="text"
            placeholder="0x..."
            value={receiverAddress}
            onChange={(e) => setReceiverAddress(e.target.value)}
            className="border-rose-200 focus:border-rose-400 focus:ring-rose-400"
            disabled={!isConnected || mintState === 'pending'}
          />
          <p className="text-xs text-gray-500">
            Send this wish NFT to yourself or a friend
          </p>
        </div>

        {streak > 0 && (
          <div className="rounded-lg border border-orange-200 bg-gradient-to-r from-orange-50 to-rose-50 p-3">
            <p className="text-center text-sm font-medium text-gray-700">
              Current Streak: <span className="text-lg font-bold text-orange-600">{streak} days</span> 🔥
            </p>
          </div>
        )}

        <Button
          onClick={handleMint}
          disabled={
            !isConnected ||
            !wishText.trim() ||
            !receiverAddress ||
            mintState === 'pending' ||
            hasMintedToday
          }
          className="w-full bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:from-rose-600 hover:to-orange-600 disabled:opacity-50"
          size="lg"
        >
          {mintState === 'pending' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mintState === 'idle' && !isConnected && 'Connect Wallet to Mint'}
          {mintState === 'idle' && isConnected && "Mint Today's NFT"}
          {mintState === 'checking' && 'Checking...'}
          {mintState === 'pending' && 'Minting on Arc Testnet...'}
          {mintState === 'success' && 'Mint Successful!'}
          {mintState === 'error' && 'Try Again'}
        </Button>

        {mintState === 'pending' && (
          <Alert className="border-blue-200 bg-blue-50">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription className="text-blue-900">
              {txHash
                ? 'Transaction pending on Arc Testnet... Please wait for confirmation.'
                : 'Waiting for wallet confirmation...'}
            </AlertDescription>
          </Alert>
        )}

        {mintState === 'success' && txHash && (
          <Alert className="border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-emerald-900">
              Mint successful on Arc Testnet!{' '}
              <a
                href={`${ARC_TESTNET_CONFIG.blockExplorer}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline hover:text-emerald-700"
              >
                View transaction
              </a>
            </AlertDescription>
          </Alert>
        )}

        {mintState === 'error' && errorMessage && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="text-red-900">{errorMessage}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
