"use client"

import { WalletConnection } from "@/components/wallet-connection"
import { DailyMintPanel } from "@/components/daily-mint-panel"
import { SwapPanel } from "@/components/swap-panel"
import { SocialTasksPanel } from "@/components/social-tasks-panel"
import { ReferralPanel } from "@/components/referral-panel"
import { ProfileWishesGrid } from "@/components/profile-wishes-grid"
import { HowItWorks } from "@/components/how-it-works"
import { useWallet } from "@/hooks/use-wallet"
import { ExternalLink } from "lucide-react"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Page() {
  const { address, isConnected } = useWallet()

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50">
      {/* Header */}
      <header className="border-b border-rose-200/50 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center">
                <Image src="/network-icon.svg" alt="Arc Network Logo" width={40} height={40} className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Daily Wish</h1>
                <p className="text-xs text-gray-600">Mint your wish onchain</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700">
                Live on Arc Testnet
              </div>
              <WalletConnection />
            </div>
          </div>
        </div>
      </header>

      {/* Links Banner */}
      <div className="border-b border-rose-200/50 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <a
              href="https://faucet.circle.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-blue-100 px-4 py-1.5 font-medium text-blue-700 transition-colors hover:bg-blue-200"
            >
              Get Testnet USDC
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://x.com/OxVentura/status/1989423714736255346"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-purple-100 px-4 py-1.5 font-medium text-purple-700 transition-colors hover:bg-purple-200"
            >
              Arc Testnet Guide
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 text-center md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-balance text-4xl font-bold text-gray-900 md:text-5xl lg:text-6xl">
            Mint your daily wish onchain
          </h2>
          <p className="mt-6 text-pretty text-lg text-gray-600 md:text-xl">
            One wish a day, one NFT on Arc Testnet, forever in your wallet.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-20">
        <div className="mx-auto max-w-4xl space-y-12">
          <Tabs defaultValue="mint" className="w-full">
            <TabsList className="mx-auto w-fit">
              <TabsTrigger value="mint">Mint Wish</TabsTrigger>
              <TabsTrigger value="swap">Swap</TabsTrigger>
              <TabsTrigger value="earn">Earn $WISH</TabsTrigger>
              <TabsTrigger value="referrals">Referrals</TabsTrigger>
            </TabsList>

            <TabsContent value="mint" className="mt-6">
              <DailyMintPanel />
            </TabsContent>

            <TabsContent value="swap" className="mt-6">
              <SwapPanel />
            </TabsContent>

            <TabsContent value="earn" className="mt-6">
              <SocialTasksPanel />
            </TabsContent>

            <TabsContent value="referrals" className="mt-6">
              <ReferralPanel />
            </TabsContent>
          </Tabs>

          {/* Profile Wishes Grid - Only show if connected */}
          {isConnected && address && <ProfileWishesGrid address={address} />}

          {/* How It Works */}
          <HowItWorks />
        </div>
      </div>
    </div>
  )
}
