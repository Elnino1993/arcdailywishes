'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWallet, ARC_TESTNET_CONFIG } from '@/hooks/use-wallet'
import { ArrowDownUp, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import { Contract, parseUnits, formatUnits } from 'ethers'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { WISH_TOKEN_CONFIG, USDC_TOKEN_CONFIG, isWishTokenDeployed } from '@/lib/contract-config'

// Simple ERC20 ABI for token operations
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
]

type SwapState = 'idle' | 'approving' | 'swapping' | 'success' | 'error'
type SwapDirection = 'usdcToWish' | 'wishToUsdc'

export function SwapPanel() {
  const { address, isConnected, chainId, signer, switchToArcTestnet } = useWallet()
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [usdcBalance, setUsdcBalance] = useState('0')
  const [wishBalance, setWishBalance] = useState('0')
  const [swapState, setSwapState] = useState<SwapState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [txHash, setTxHash] = useState('')
  const [exchangeRate] = useState(100) // 1 USDC = 100 WISH (example rate)
  const [contractsConfigured, setContractsConfigured] = useState(false)
  const [balancesLoading, setBalancesLoading] = useState(false)
  const [swapDirection, setSwapDirection] = useState<SwapDirection>('usdcToWish')

  const isWrongNetwork = isConnected && chainId !== ARC_TESTNET_CONFIG.chainId
  const isWishContractConfigured = isWishTokenDeployed()

  useEffect(() => {
    if (!isConnected || !address || !signer || isWrongNetwork) {
      setContractsConfigured(false)
      return
    }

    const fetchBalances = async () => {
      setBalancesLoading(true)
      try {
        const usdcContract = new Contract(USDC_TOKEN_CONFIG.address, ERC20_ABI, signer)
        
        let usdcBal = BigInt(0)
        let wishBal = BigInt(0)
        let usdcExists = false

        try {
          usdcBal = await usdcContract.balanceOf(address)
          usdcExists = true
        } catch (error: any) {
          console.log('[v0] USDC contract not found or invalid:', error.message)
        }

        if (isWishContractConfigured) {
          const wishContract = new Contract(WISH_TOKEN_CONFIG.address, WISH_TOKEN_CONFIG.abi, signer)
          try {
            wishBal = await wishContract.balanceOf(address)
          } catch (error: any) {
            console.log('[v0] WISH contract not found or invalid:', error.message)
          }
        }

        setUsdcBalance(formatUnits(usdcBal, USDC_TOKEN_CONFIG.decimals))
        setWishBalance(formatUnits(wishBal, WISH_TOKEN_CONFIG.decimals))
        setContractsConfigured(usdcExists)
      } catch (error) {
        console.error('[v0] Error fetching balances:', error)
        setContractsConfigured(false)
      } finally {
        setBalancesLoading(false)
      }
    }

    fetchBalances()
    const interval = setInterval(fetchBalances, 10000)

    return () => clearInterval(interval)
  }, [isConnected, address, signer, isWrongNetwork, isWishContractConfigured])

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value)
    if (value && !isNaN(parseFloat(value))) {
      if (swapDirection === 'usdcToWish') {
        const wish = (parseFloat(value) * exchangeRate).toFixed(2)
        setToAmount(wish)
      } else {
        const usdc = (parseFloat(value) / exchangeRate).toFixed(6)
        setToAmount(usdc)
      }
    } else {
      setToAmount('')
    }
  }

  const handleReverseDirection = () => {
    setSwapDirection(prev => prev === 'usdcToWish' ? 'wishToUsdc' : 'usdcToWish')
    setFromAmount(toAmount)
    setToAmount(fromAmount)
  }

  const handleSwap = async () => {
    if (!isConnected || !address || !signer) {
      setErrorMessage('Please connect your wallet')
      return
    }

    if (isWrongNetwork) {
      setErrorMessage('Please switch to Arc Testnet')
      return
    }

    if (!isWishContractConfigured) {
      setErrorMessage('WISH token contract not configured. Please deploy the contract first.')
      return
    }

    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setErrorMessage(`Please enter a valid ${swapDirection === 'usdcToWish' ? 'USDC' : 'WISH'} amount`)
      return
    }

    const balance = swapDirection === 'usdcToWish' ? usdcBalance : wishBalance
    const tokenName = swapDirection === 'usdcToWish' ? 'USDC' : 'WISH'
    
    if (parseFloat(fromAmount) > parseFloat(balance)) {
      setErrorMessage(`Insufficient ${tokenName} balance`)
      return
    }

    try {
      setSwapState('approving')
      setErrorMessage('')
      setTxHash('')

      const wishContract = new Contract(WISH_TOKEN_CONFIG.address, WISH_TOKEN_CONFIG.abi, signer)

      if (swapDirection === 'usdcToWish') {
        const usdcContract = new Contract(USDC_TOKEN_CONFIG.address, ERC20_ABI, signer)
        const amount = parseUnits(fromAmount, USDC_TOKEN_CONFIG.decimals)

        // Check and approve USDC spending
        const allowance = await usdcContract.allowance(address, WISH_TOKEN_CONFIG.address)
        
        if (allowance < amount) {
          const approveTx = await usdcContract.approve(WISH_TOKEN_CONFIG.address, amount)
          await approveTx.wait()
        }

        setSwapState('swapping')
        const swapTx = await wishContract.swapUSDCForWISH(amount)
        const receipt = await swapTx.wait()
        setTxHash(receipt.hash)
      } else {
        // WISH to USDC swap
        const amount = parseUnits(fromAmount, WISH_TOKEN_CONFIG.decimals)

        // Check and approve WISH spending
        const allowance = await wishContract.allowance(address, WISH_TOKEN_CONFIG.address)
        
        if (allowance < amount) {
          const approveTx = await wishContract.approve(WISH_TOKEN_CONFIG.address, amount)
          await approveTx.wait()
        }

        setSwapState('swapping')
        const swapTx = await wishContract.swapWISHForUSDC(amount)
        const receipt = await swapTx.wait()
        setTxHash(receipt.hash)
      }
      
      setSwapState('success')
      setFromAmount('')
      setToAmount('')

      // Refresh balances
      setTimeout(() => {
        setSwapState('idle')
      }, 3000)
    } catch (error: any) {
      console.error('[v0] Swap error:', error)
      setSwapState('error')
      
      let message = 'Swap failed. Please try again.'
      if (error.code === 4001) {
        message = 'Transaction rejected by user'
      } else if (error.message) {
        message = error.message
      }
      
      setErrorMessage(message)
    }
  }

  const fromToken = swapDirection === 'usdcToWish' ? 'USDC' : 'WISH'
  const toToken = swapDirection === 'usdcToWish' ? 'WISH' : 'USDC'
  const fromBalance = swapDirection === 'usdcToWish' ? usdcBalance : wishBalance
  const toBalance = swapDirection === 'usdcToWish' ? wishBalance : usdcBalance

  if (!isWishContractConfigured) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-amber-900">
            <AlertCircle className="h-5 w-5" />
            Deploy WISH Token Contract First
          </CardTitle>
          <CardDescription className="text-amber-800">
            Before you can swap tokens, deploy the WISH token smart contract to Arc Testnet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 rounded-lg border border-amber-300 bg-white p-4">
            <div>
              <strong className="text-amber-900">Step 1: Deploy the Contract</strong>
              <ul className="ml-4 mt-2 list-disc space-y-1 text-sm text-gray-700">
                <li>Open <code className="rounded bg-gray-100 px-1 text-xs">lib/wish-token-contract.sol</code></li>
                <li>Deploy it to Arc Testnet using Remix or your preferred tool</li>
                <li>When deploying, provide the USDC address: <code className="rounded bg-gray-100 px-1 text-xs">{USDC_TOKEN_CONFIG.address}</code></li>
                <li>Copy the deployed contract address</li>
              </ul>
            </div>

            <div>
              <strong className="text-amber-900">Step 2: Update Configuration</strong>
              <ul className="ml-4 mt-2 list-disc space-y-1 text-sm text-gray-700">
                <li>Open <code className="rounded bg-gray-100 px-1 text-xs">lib/contract-config.ts</code></li>
                <li>Find <code className="rounded bg-gray-100 px-1 text-xs">WISH_TOKEN_CONFIG</code></li>
                <li>Replace the placeholder address with your deployed contract address</li>
                <li>Save the file and the swap interface will become active</li>
              </ul>
            </div>
          </div>

          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Need testnet tokens?</strong> Get Arc Testnet ETH from the{' '}
              <a
                href={ARC_TESTNET_CONFIG.faucet}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                Arc Faucet
              </a>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-rose-200 bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <ArrowDownUp className="h-6 w-6 text-rose-500" />
          Swap Tokens
        </CardTitle>
        <CardDescription>
          {swapDirection === 'usdcToWish' 
            ? `Exchange USDC for WISH tokens at a rate of 1 USDC = ${exchangeRate} WISH`
            : `Exchange WISH for USDC tokens at a rate of ${exchangeRate} WISH = 1 USDC`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isConnected && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to swap tokens
            </AlertDescription>
          </Alert>
        )}

        {isWrongNetwork && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Please switch to Arc Testnet to continue</span>
              <Button
                size="sm"
                variant="outline"
                onClick={switchToArcTestnet}
                className="ml-2"
              >
                Switch Network
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isConnected && !isWrongNetwork && (
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-rose-50 p-4">
            <div>
              <p className="text-xs text-gray-600">USDC Balance</p>
              <p className="text-lg font-semibold text-gray-900">
                {balancesLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  parseFloat(usdcBalance).toFixed(2)
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">WISH Balance</p>
              <p className="text-lg font-semibold text-gray-900">
                {balancesLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  parseFloat(wishBalance).toFixed(2)
                )}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">From</label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => handleFromAmountChange(e.target.value)}
                disabled={!isConnected || isWrongNetwork || swapState !== 'idle'}
                className="pr-16 text-lg"
                step={swapDirection === 'usdcToWish' ? '0.01' : '0.001'}
                min="0"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-600">
                {fromToken}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Balance: {parseFloat(fromBalance).toFixed(swapDirection === 'usdcToWish' ? 2 : 4)}
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReverseDirection}
              disabled={swapState !== 'idle'}
              className="h-10 w-10 rounded-full bg-rose-100 hover:bg-rose-200"
            >
              <ArrowDownUp className="h-5 w-5 text-rose-600" />
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">To (estimated)</label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.00"
                value={toAmount}
                disabled
                className="pr-16 text-lg"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-600">
                {toToken}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Balance: {parseFloat(toBalance).toFixed(swapDirection === 'wishToUsdc' ? 2 : 4)}
            </p>
          </div>
        </div>

        {errorMessage && swapState === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {swapState === 'success' && (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription>
              Swap successful! Your tokens have been transferred.
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleSwap}
          disabled={
            !isConnected ||
            isWrongNetwork ||
            !fromAmount ||
            parseFloat(fromAmount) <= 0 ||
            swapState === 'approving' ||
            swapState === 'swapping' ||
            swapState === 'success'
          }
          className="w-full bg-gradient-to-r from-rose-500 to-orange-500 text-lg font-semibold hover:from-rose-600 hover:to-orange-600"
          size="lg"
        >
          {swapState === 'approving' && (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Approving {fromToken}...
            </>
          )}
          {swapState === 'swapping' && (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Swapping...
            </>
          )}
          {swapState === 'success' && (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Swap Complete!
            </>
          )}
          {(swapState === 'idle' || swapState === 'error') && `Swap ${fromToken} for ${toToken}`}
        </Button>

        {txHash && (
          <div className="text-center text-sm">
            <a
              href={`${ARC_TESTNET_CONFIG.blockExplorer}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-rose-600 hover:underline"
            >
              View transaction <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
