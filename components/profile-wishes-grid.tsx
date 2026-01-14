'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useWallet, ARC_TESTNET_CONFIG } from '@/hooks/use-wallet'
import { NFT_CONTRACT_CONFIG, type Wish, isContractDeployed } from '@/lib/contract-config'
import { Contract } from 'ethers'
import { Calendar, ExternalLink, Sparkles, Loader2, AlertTriangle, Rocket } from 'lucide-react'

interface ProfileWishesGridProps {
  address: string
}

export function ProfileWishesGrid({ address }: ProfileWishesGridProps) {
  const { signer, chainId } = useWallet()
  const [wishes, setWishes] = useState<Wish[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null)

  const isOnArcTestnet = chainId === ARC_TESTNET_CONFIG.chainId

  useEffect(() => {
    const fetchWishes = async () => {
      if (!signer || !address || !isOnArcTestnet) {
        console.log('[v0] ProfileWishesGrid: Skipping fetch - missing requirements:', { 
          signer: !!signer, 
          address, 
          isOnArcTestnet 
        })
        setLoading(false)
        return
      }

      if (!isContractDeployed()) {
        console.log('[v0] ProfileWishesGrid: Contract not deployed, skipping fetch')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        console.log('[v0] ProfileWishesGrid: Fetching wishes for address:', address)
        const contract = new Contract(NFT_CONTRACT_CONFIG.address, NFT_CONTRACT_CONFIG.abi, signer)
        const wishesData = await contract.getWishesByAddress(address)
        
        console.log('[v0] ProfileWishesGrid: Fetched wishes data:', wishesData)
        
        // Convert to our Wish type
        const formattedWishes: Wish[] = wishesData.map((wish: any) => ({
          tokenId: Number(wish.tokenId),
          wishText: wish.wishText,
          dateKey: wish.dateKey,
          timestamp: Number(wish.timestamp),
        }))

        // Sort by timestamp descending (newest first)
        formattedWishes.sort((a, b) => b.timestamp - a.timestamp)
        
        setWishes(formattedWishes)
        console.log('[v0] ProfileWishesGrid: Successfully loaded', formattedWishes.length, 'wishes')
      } catch (error: any) {
        console.error('[v0] ProfileWishesGrid: Error fetching wishes:', error)
        setError(error.message || 'Failed to load wishes')
      } finally {
        setLoading(false)
      }
    }

    fetchWishes()
  }, [signer, address, isOnArcTestnet])

  if (!isContractDeployed()) {
    return (
      <section className="space-y-6">
        <h3 className="text-2xl font-bold text-gray-900">Your Wishes</h3>
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Rocket className="h-12 w-12 text-blue-500" />
            <p className="mt-4 text-lg font-medium text-gray-900">Contract Not Deployed</p>
            <p className="mt-2 text-sm text-gray-600">
              Deploy the smart contract to Arc Testnet to start collecting wishes
            </p>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (!isOnArcTestnet) {
    return null
  }

  if (loading) {
    return (
      <section className="space-y-6">
        <h3 className="text-2xl font-bold text-gray-900">Your Wishes</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse border-gray-200">
              <CardContent className="p-6">
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="mt-4 h-20 rounded bg-gray-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="space-y-6">
        <h3 className="text-2xl font-bold text-gray-900">Your Wishes</h3>
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-rose-50">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-orange-500" />
            <p className="mt-4 text-lg font-medium text-gray-900">Unable to Load Wishes</p>
            <p className="mt-2 text-sm text-gray-600">
              Failed to connect to the contract on Arc Testnet
            </p>
            <p className="mt-2 text-xs text-gray-500">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="mt-6"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (wishes.length === 0) {
    return (
      <section className="space-y-6">
        <h3 className="text-2xl font-bold text-gray-900">Your Wishes</h3>
        <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Sparkles className="h-12 w-12 text-gray-400" />
            <p className="mt-4 text-lg font-medium text-gray-600">No wishes yet</p>
            <p className="mt-2 text-sm text-gray-500">
              Mint your first daily wish to start your collection
            </p>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <>
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-gray-900">Your Wishes</h3>
          <p className="text-sm text-gray-600">{wishes.length} total</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wishes.map((wish) => (
            <Card
              key={wish.tokenId}
              className="group cursor-pointer border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 transition-all hover:scale-[1.02] hover:shadow-lg"
              onClick={() => setSelectedWish(wish)}
            >
              <CardContent className="p-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(wish.dateKey).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-xs text-gray-500">#{wish.tokenId}</span>
                </div>
                <p className="line-clamp-3 text-sm leading-relaxed text-gray-700">
                  {wish.wishText}
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-rose-600 opacity-0 transition-opacity group-hover:opacity-100">
                  <span>View details</span>
                  <ExternalLink className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Wish Detail Modal */}
      <Dialog open={!!selectedWish} onOpenChange={() => setSelectedWish(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-rose-500" />
              Wish #{selectedWish?.tokenId}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {selectedWish?.dateKey &&
                new Date(selectedWish.dateKey).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* NFT Preview */}
            <div className="aspect-square overflow-hidden rounded-lg border-2 border-rose-200 bg-gradient-to-br from-rose-100 to-orange-100 p-6">
              <div className="flex h-full flex-col justify-between">
                <div className="text-sm text-gray-600">{selectedWish?.dateKey}</div>
                <div className="text-lg leading-relaxed text-gray-800">
                  {selectedWish?.wishText}
                </div>
                <div className="text-right text-xs text-gray-500">
                  Wish #{selectedWish?.tokenId}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  window.open(
                    `${ARC_TESTNET_CONFIG.blockExplorer}/address/${NFT_CONTRACT_CONFIG.address}`,
                    '_blank'
                  )
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View on Explorer
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:from-rose-600 hover:to-orange-600"
                onClick={() => setSelectedWish(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
