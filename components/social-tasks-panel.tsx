"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Twitter,
  MessageCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Trophy,
  Coins,
  Gift,
  AlertTriangle,
} from "lucide-react"
import { Contract } from "ethers"
import { parseUnits } from "ethers"
import { WISH_TOKEN_CONFIG, isWishTokenDeployed } from "@/lib/contract-config"

type Task = {
  id: string
  title: string
  description: string
  reward: number
  icon: React.ReactNode
  action: string
  link: string
  completed: boolean
}

const SOCIAL_TASKS: Omit<Task, "completed">[] = [
  {
    id: "twitter_follow",
    title: "Follow on Twitter",
    description: "Follow our official Twitter account",
    reward: 50,
    icon: <Twitter className="h-5 w-5" />,
    action: "Follow @OxVentura",
    link: "https://x.com/OxVentura",
  },
  {
    id: "twitter_retweet",
    title: "Retweet Launch Post",
    description: "Retweet our launch announcement",
    reward: 30,
    icon: <Twitter className="h-5 w-5" />,
    action: "Retweet",
    link: "https://x.com/OxVentura/status/1989423714736255346",
  },
  {
    id: "twitter_comment",
    title: "Comment on Post",
    description: "Leave a comment on our launch post",
    reward: 40,
    icon: <MessageCircle className="h-5 w-5" />,
    action: "Comment",
    link: "https://x.com/OxVentura/status/1989423714736255346",
  },
  {
    id: "twitter_tag",
    title: "Tag 3 Friends",
    description: "Tweet about Daily Wish and tag 3 friends",
    reward: 100,
    icon: <Gift className="h-5 w-5" />,
    action: "Tweet",
    link: "https://twitter.com/intent/tweet?text=Just%20minted%20my%20daily%20wish%20on%20%40OxVentura%20%F0%9F%92%AB%20%0A%0AMint%20yours%20at%20dailywishonarc.xyz",
  },
  {
    id: "twitter_community",
    title: "Join X Community",
    description: "Join our X community",
    reward: 40,
    icon: <Twitter className="h-5 w-5" />,
    action: "Join Community",
    link: "https://x.com/i/communities/1990113211111125196",
  },
  {
    id: "telegram_join",
    title: "Join Telegram",
    description: "Join our Telegram community",
    reward: 40,
    icon: <MessageCircle className="h-5 w-5" />,
    action: "Join Group",
    link: "https://t.me/OxVentura",
  },
]

type ClaimState = "idle" | "claiming" | "success" | "error"

export function SocialTasksPanel() {
  const { address, isConnected, signer, isOnArcTestnet, switchToArcTestnet } = useWallet()
  const [tasks, setTasks] = useState<Task[]>([])
  const [claimState, setClaimState] = useState<ClaimState>("idle")
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [totalEarned, setTotalEarned] = useState(0)
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false)

  const isWishContractConfigured = isWishTokenDeployed()

  // Load completed tasks from localStorage
  useEffect(() => {
    if (!address) return

    const storageKey = `social_tasks_${address}`
    const savedData = localStorage.getItem(storageKey)

    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        const completedIds = new Set(parsed.completedTasks || [])
        const tasksWithStatus = SOCIAL_TASKS.map((task) => ({
          ...task,
          completed: completedIds.has(task.id),
        }))
        setTasks(tasksWithStatus)
        setTotalEarned(parsed.totalEarned || 0)
      } catch (error) {
        console.error("[v0] Error loading saved tasks:", error)
        setTasks(SOCIAL_TASKS.map((task) => ({ ...task, completed: false })))
      }
    } else {
      setTasks(SOCIAL_TASKS.map((task) => ({ ...task, completed: false })))
    }
  }, [address])

  const handleTaskClick = (task: Task) => {
    window.open(task.link, "_blank", "noopener,noreferrer")
  }

  const handleClaimReward = async (task: Task) => {
    if (!isConnected || !address || !signer || !isWishContractConfigured) {
      setErrorMessage("Please connect your wallet and ensure WISH token is deployed")
      return
    }

    if (!isOnArcTestnet) {
      setClaimState("error")
      setErrorMessage("Please switch to Arc Testnet to claim rewards")
      return
    }

    setClaimState("claiming")
    setClaimingTaskId(task.id)
    setErrorMessage("")

    try {
      console.log("[v0] Starting WISH token claim for task:", task.id)

      const wishContract = new Contract(WISH_TOKEN_CONFIG.address, WISH_TOKEN_CONFIG.abi, signer)

      console.log("[v0] Checking if task already claimed on-chain...")
      const alreadyClaimed = await wishContract.hasClaimedTask(address, task.id)

      if (alreadyClaimed) {
        console.log("[v0] Task already claimed on-chain")
        setClaimState("error")
        setErrorMessage("This task has already been claimed on the blockchain")
        setClaimingTaskId(null)
        return
      }

      console.log("[v0] Checking contract WISH balance...")
      const contractBalance = await wishContract.getContractWISHBalance()
      const rewardAmount = parseUnits(task.reward.toString(), WISH_TOKEN_CONFIG.decimals)

      console.log("[v0] Contract balance:", contractBalance.toString())
      console.log("[v0] Required amount:", rewardAmount.toString())

      if (contractBalance < rewardAmount) {
        console.log("[v0] Insufficient contract balance")
        setClaimState("error")
        setErrorMessage("The contract does not have enough WISH tokens. Please contact support.")
        setClaimingTaskId(null)
        return
      }

      console.log("[v0] Claiming reward amount:", task.reward, "WISH tokens")

      const tx = await wishContract.claimSocialReward(task.id, rewardAmount, {
        gasLimit: 150000, // Set explicit gas limit to avoid estimation issues
      })
      console.log("[v0] Transaction sent:", tx.hash)

      const receipt = await tx.wait()
      console.log("[v0] Transaction confirmed:", receipt)

      const updatedTasks = tasks.map((t) => (t.id === task.id ? { ...t, completed: true } : t))
      setTasks(updatedTasks)

      const newTotal = totalEarned + task.reward
      setTotalEarned(newTotal)

      const storageKey = `social_tasks_${address}`
      const completedIds = updatedTasks.filter((t) => t.completed).map((t) => t.id)
      localStorage.setItem(storageKey, JSON.stringify({ completedTasks: completedIds, totalEarned: newTotal }))

      setClaimState("success")
      setTimeout(() => {
        setClaimState("idle")
        setClaimingTaskId(null)
      }, 3000)
    } catch (error: any) {
      console.error("[v0] Claim error:", error)
      setClaimState("error")

      if (error.code === "ACTION_REJECTED" || error.code === 4001) {
        setErrorMessage("Transaction was rejected. Please try again.")
      } else if (error.message?.includes("already claimed")) {
        setErrorMessage("This reward has already been claimed.")
      } else if (error.message?.includes("Insufficient WISH")) {
        setErrorMessage("The contract does not have enough WISH tokens to distribute.")
      } else if (error.reason) {
        setErrorMessage(`Contract error: ${error.reason}`)
      } else if (error.message?.includes("missing revert data")) {
        setErrorMessage(
          "Contract interaction failed. The WISH token contract may not be properly deployed or configured.",
        )
      } else {
        setErrorMessage(error.message || "Failed to claim reward. Please try again.")
      }

      setClaimingTaskId(null)
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

  const completedCount = tasks.filter((t) => t.completed).length
  const totalRewards = SOCIAL_TASKS.reduce((sum, task) => sum + task.reward, 0)

  if (!isWishContractConfigured) {
    return (
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Trophy className="h-5 w-5" />
            Social Tasks Coming Soon
          </CardTitle>
          <CardDescription className="text-purple-700">
            Deploy the WISH token contract to unlock social tasks and start earning rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-purple-200 bg-white/50">
            <AlertDescription className="text-sm text-gray-700">
              Complete the WISH token deployment first to enable the social tasks feature. Once deployed, you'll be able
              to earn WISH tokens by completing various social media tasks.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl text-purple-900">
              <Trophy className="h-6 w-6" />
              Earn $WISH
            </CardTitle>
            <CardDescription className="text-purple-700">Complete social tasks to earn WISH tokens</CardDescription>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1.5 bg-purple-100 text-purple-900">
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

        <div className="rounded-lg border border-purple-200 bg-white/70 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Task Progress</span>
            <span className="text-purple-600">
              {completedCount} / {tasks.length} completed
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-purple-100">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${(completedCount / tasks.length) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-gray-600">
            Complete all tasks to earn {totalRewards} WISH tokens
          </p>
        </div>

        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`rounded-lg border-2 p-4 transition-all ${
                task.completed
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-purple-200 bg-white hover:border-purple-300"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-1 items-start gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      task.completed ? "bg-emerald-100 text-emerald-600" : "bg-purple-100 text-purple-600"
                    }`}
                  >
                    {task.completed ? <CheckCircle2 className="h-5 w-5" /> : task.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{task.title}</h4>
                    <p className="text-sm text-gray-600">{task.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                        +{task.reward} WISH
                      </Badge>
                      {task.completed && (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-900">
                          Claimed
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {!task.completed && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTaskClick(task)}
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        {task.action}
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleClaimReward(task)}
                        disabled={claimState === "claiming" || !isConnected || !isOnArcTestnet}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
                      >
                        {claimingTaskId === task.id && claimState === "claiming" ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Claiming...
                          </>
                        ) : (
                          "Claim Reward"
                        )}
                      </Button>
                    </>
                  )}
                  {task.completed && (
                    <div className="flex h-[72px] items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
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

        {!isConnected && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-900">
              Connect your wallet to start completing tasks and earning WISH tokens
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
