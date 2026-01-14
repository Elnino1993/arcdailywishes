"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Users, Copy, CheckCircle2, Loader2, Gift, AlertTriangle, Coins, Share2 } from "lucide-react"
import { Contract, parseUnits } from "ethers"
import { WISH_TOKEN_CONFIG, isWishTokenDeployed } from "@/lib/contract-config"

const REFERRAL_REWARD = 100 // WISH tokens per referral

type ClaimState = "idle" | "claiming" | "success" | "error"

export function ReferralPanel() {
  const { address, isConnected, signer, isOnArcTestnet, switchToArcTestnet } = useWallet()
  const [copied, setCopied] = useState(false)
  const [referralCount, setReferralCount] = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [claimableRewards, setClaimableRewards] = useState(0)
  const [claimState, setClaimState] = useState<ClaimState>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false)

  const isWishContractConfigured = isWishTokenDeployed()

  // Generate referral link
  const referralLink = address ? `${typeof window !== "undefined" ? window.location.origin : ""}?ref=${address}` : ""

  // Load referral data from localStorage
  useEffect(() => {
    if (!address) return

    const storageKey = `referral_data_${address}`
    const savedData = localStorage.getItem(storageKey)

    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        setReferralCount(parsed.referralCount || 0)
        setTotalEarned(parsed.totalEarned || 0)
        setClaimableRewards(parsed.claimableRewards || 0)
      } catch (error) {
        console.error("[v0] Error loading referral data:", error)
      }
    }
  }, [address])

  // Check and process referral on page load
  useEffect(() => {
    if (typeof window === "undefined" || !address) return

    const urlParams = new URLSearchParams(window.location.search)
    const refAddress = urlParams.get("ref")

    if (refAddress && refAddress !== address) {
      // Store that this user was referred
      const referredKey = `referred_by_${address}`
      const alreadyReferred = localStorage.getItem(referredKey)

      if (!alreadyReferred) {
        localStorage.setItem(referredKey, refAddress)

        // Add to referrer's count
        const referrerStorageKey = `referral_data_${refAddress}`
        const referrerData = localStorage.getItem(referrerStorageKey)

        let referrerCount = 0
        let referrerEarned = 0
        let referrerClaimable = 0

        if (referrerData) {
          try {
            const parsed = JSON.parse(referrerData)
            referrerCount = parsed.referralCount || 0
            referrerEarned = parsed.totalEarned || 0
            referrerClaimable = parsed.claimableRewards || 0
          } catch (error) {
            console.error("[v0] Error parsing referrer data:", error)
          }
        }

        localStorage.setItem(
          referrerStorageKey,
          JSON.stringify({
            referralCount: referrerCount + 1,
            totalEarned: referrerEarned,
            claimableRewards: referrerClaimable + REFERRAL_REWARD,
          }),
        )

        // Clean up URL
        const newUrl = window.location.pathname
        window.history.replaceState({}, "", newUrl)
      }
    }
  }, [address])

  const handleCopyLink = async () => {
    if (!referralLink) return

    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("[v0] Failed to copy:", error)
    }
  }

  const handleClaimRewards = async () => {
    if (!isConnected || !address || !signer || !isWishContractConfigured) {
      setErrorMessage("Please connect your wallet and ensure WISH token is deployed")
      return
    }

    if (!isOnArcTestnet) {
      setClaimState("error")
      setErrorMessage("Please switch to Arc Testnet to claim rewards")
      return
    }

    if (claimableRewards <= 0) {
      setErrorMessage("No rewards to claim")
      return
    }

    setClaimState("claiming")
    setErrorMessage("")

    try {
      console.log("[v0] Starting referral reward claim")

      const wishContract = new Contract(WISH_TOKEN_CONFIG.address, WISH_TOKEN_CONFIG.abi, signer)

      // Check if this referral batch already claimed
      const taskId = `referral_${address}_${Date.now()}`

      console.log("[v0] Checking contract WISH balance...")
      const contractBalance = await wishContract.getContractWISHBalance()
      const rewardAmount = parseUnits(claimableRewards.toString(), WISH_TOKEN_CONFIG.decimals)

      console.log("[v0] Contract balance:", contractBalance.toString())
      console.log("[v0] Required amount:", rewardAmount.toString())

      if (contractBalance < rewardAmount) {
        console.log("[v0] Insufficient contract balance")
        setClaimState("error")
        setErrorMessage("The contract does not have enough WISH tokens. Please contact support.")
        return
      }

      console.log("[v0] Claiming referral reward:", claimableRewards, "WISH tokens")

      const tx = await wishContract.claimSocialReward(taskId, rewardAmount, {
        gasLimit: 150000,
      })
      console.log("[v0] Transaction sent:", tx.hash)

      const receipt = await tx.wait()
      console.log("[v0] Transaction confirmed:", receipt)

      // Update local storage
      const newTotalEarned = totalEarned + claimableRewards
      setTotalEarned(newTotalEarned)
      setClaimableRewards(0)

      const storageKey = `referral_data_${address}`
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          referralCount,
          totalEarned: newTotalEarned,
          claimableRewards: 0,
        }),
      )

      setClaimState("success")
      setTimeout(() => {
        setClaimState("idle")
      }, 3000)
    } catch (error: any) {
      console.error("[v0] Claim error:", error)
      setClaimState("error")

      if (error.code === "ACTION_REJECTED" || error.code === 4001) {
        setErrorMessage("Transaction was rejected. Please try again.")
      } else if (error.reason) {
        setErrorMessage(`Contract error: ${error.reason}`)
      } else {
        setErrorMessage(error.message || "Failed to claim reward. Please try again.")
      }
    }
  }

  const handleSwitchNetwork = async () => {
    setIsSwitchingNetwork(true)
    try {
      await switchToArcTestnet()
    } catch (error) {
      console.error("[v0] Failed to switch network:", error)
    } finally {
      setIsSwitchingNetwork(false)
    }
  }

  const handleShareTwitter = () => {
    const text = `Join Daily Wish and earn $WISH tokens! Use my referral link to get started: ${referralLink}`
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    window.open(twitterUrl, "_blank", "noopener,noreferrer")
  }

  const handleShareTelegram = () => {
    const text = `Join Daily Wish and earn $WISH tokens! Use my referral link: ${referralLink}`
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`
    window.open(telegramUrl, "_blank", "noopener,noreferrer")
  }

  if (!isWishContractConfigured) {
    return (
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Users className="h-5 w-5" />
            Referral Program Coming Soon
          </CardTitle>
          <CardDescription className="text-blue-700">
            Deploy the WISH token contract to unlock the referral program
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-blue-200 bg-white/50">
            <AlertDescription className="text-sm text-gray-700">
              Complete the WISH token deployment first to enable the referral program. Once deployed, you'll be able to
              earn {REFERRAL_REWARD} WISH tokens for each friend you invite.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl text-blue-900">
              <Users className="h-6 w-6" />
              Referral Program
            </CardTitle>
            <CardDescription className="text-blue-700">
              Invite friends and earn {REFERRAL_REWARD} WISH per referral
            </CardDescription>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1.5 bg-blue-100 text-blue-900">
            <Coins className="h-4 w-4" />
            {totalEarned} WISH Earned
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isConnected && !isOnArcTestnet && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex items-center justify-between gap-3 text-amber-900">
              <span>You need to switch to Arc Testnet to claim rewards</span>
              <Button
                size="sm"
                onClick={handleSwitchNetwork}
                disabled={isSwitchingNetwork}
                className="ml-2 shrink-0 bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {isSwitchingNetwork ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Switching...
                  </>
                ) : (
                  "Switch Network"
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-blue-200 bg-white/70 p-4 text-center">
            <div className="text-2xl font-bold text-blue-900">{referralCount}</div>
            <div className="text-sm text-blue-700">Referrals</div>
          </div>
          <div className="rounded-lg border border-blue-200 bg-white/70 p-4 text-center">
            <div className="text-2xl font-bold text-blue-900">{totalEarned}</div>
            <div className="text-sm text-blue-700">Total Earned</div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-700">{claimableRewards}</div>
            <div className="text-sm text-emerald-600">Claimable</div>
          </div>
        </div>

        {/* Referral Link */}
        {isConnected && address ? (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Your Referral Link</label>
            <div className="flex gap-2">
              <Input value={referralLink} readOnly className="flex-1 bg-white font-mono text-sm" />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-50 bg-transparent"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            {/* Share Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleShareTwitter}
                variant="outline"
                className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50 bg-transparent"
              >
                <Share2 className="mr-1 h-4 w-4" />
                Share on X
              </Button>
              <Button
                onClick={handleShareTelegram}
                variant="outline"
                className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50 bg-transparent"
              >
                <Share2 className="mr-1 h-4 w-4" />
                Share on Telegram
              </Button>
            </div>
          </div>
        ) : (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-900">
              Connect your wallet to get your unique referral link
            </AlertDescription>
          </Alert>
        )}

        {/* Claim Button */}
        {claimableRewards > 0 && (
          <Button
            onClick={handleClaimRewards}
            disabled={claimState === "claiming" || !isConnected || !isOnArcTestnet}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50"
          >
            {claimState === "claiming" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <Gift className="mr-2 h-4 w-4" />
                Claim {claimableRewards} WISH
              </>
            )}
          </Button>
        )}

        {/* How it works */}
        <div className="rounded-lg border border-blue-200 bg-white/70 p-4">
          <h4 className="mb-3 font-semibold text-gray-900">How it works</h4>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                1
              </span>
              Share your unique referral link with friends
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                2
              </span>
              When they connect their wallet through your link, you get credit
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                3
              </span>
              Earn {REFERRAL_REWARD} WISH tokens for each referral
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                4
              </span>
              Claim your rewards anytime on Arc Testnet
            </li>
          </ol>
        </div>

        {claimState === "error" && errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {claimState === "success" && (
          <Alert className="border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-900">
              Reward claimed successfully! WISH tokens have been added to your wallet.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
