import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Building, Activity, Trophy } from 'lucide-react';
import { apiJson } from '../../../lib/api';
import Card from '../../../components/ui/Card';
import CutoffTrends from './sections/CutoffTrends';

export default function CollegeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await apiJson(`/api/college-detail?id=${id}`);
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch college details');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error || !data || !data.college) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-900 text-white">
        <h1 className="text-2xl font-bold mb-4">Oops! Data Not Available</h1>
        <p className="text-gray-400 mb-6">{error || 'College not found.'}</p>
        <button 
          onClick={() => navigate(-1)}
          className="px-6 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-white font-medium transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const { college, cutoffs, fees, seatMatrix } = data;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'cutoffs', label: 'Cutoffs & Admission' },
    { id: 'fees', label: 'Fees & Seat Matrix' },
    { id: 'facilities', label: 'Facilities & Faculty' },
    { id: 'reviews', label: 'Reviews' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-y-auto font-sans pb-20">
      
      {/* Sticky Header / Top Nav */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              <span>Back</span>
            </button>
            <div className="font-semibold text-lg truncate max-w-md hidden sm:block">
              {college.name}
            </div>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
          
          {/* Scrollable Tabs */}
          <div className="flex space-x-6 overflow-x-auto scrollbar-hide py-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-orange-500 text-orange-500' 
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        
        {/* Hero Section */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in-up">
            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs font-semibold mb-4 border border-orange-500/20">
                {college.college_type || 'Medical College'}
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
                {college.name}
              </h1>
              <div className="flex flex-wrap items-center text-gray-400 gap-4 text-sm sm:text-base">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1.5" />
                  {college.city ? `${college.city}, ` : ''}{college.state}
                </div>
                {college.established && (
                  <div className="flex items-center">
                    <Building className="w-4 h-4 mr-1.5" />
                    Est. {college.established}
                  </div>
                )}
                {college.hospital_beds && (
                  <div className="flex items-center">
                    <Activity className="w-4 h-4 mr-1.5" />
                    {college.hospital_beds} Beds
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-[#141a24]/80 backdrop-blur-md border-gray-800 p-5 rounded-2xl flex flex-col justify-between">
                <div className="text-gray-400 text-sm mb-2">Ownership</div>
                <div className="text-xl font-semibold">{college.college_type || 'Data Not Available'}</div>
              </Card>
              <Card className="bg-[#141a24]/80 backdrop-blur-md border-gray-800 p-5 rounded-2xl flex flex-col justify-between">
                <div className="text-gray-400 text-sm mb-2">Total Seats (MBBS)</div>
                <div className="text-xl font-semibold">
                  {seatMatrix?.length > 0 
                    ? seatMatrix.reduce((acc: number, curr: any) => acc + (curr.total_seats || 0), 0) 
                    : 'Data Not Available'}
                </div>
              </Card>
              <Card className="bg-[#141a24]/80 backdrop-blur-md border-gray-800 p-5 rounded-2xl flex flex-col justify-between">
                <div className="text-gray-400 text-sm mb-2">State Ranking</div>
                <div className="text-xl font-semibold flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                  Data Not Available
                </div>
              </Card>
              <Card className="bg-[#141a24]/80 backdrop-blur-md border-gray-800 p-5 rounded-2xl flex flex-col justify-between">
                <div className="text-gray-400 text-sm mb-2">Annual Tuition Fee</div>
                <div className="text-xl font-semibold">
                  {fees?.length > 0 && fees[0].tuition_annual 
                    ? `₹${fees[0].tuition_annual.toLocaleString('en-IN')}` 
                    : 'Data Not Available'}
                </div>
              </Card>
            </div>
            
            {/* AI Insights Stub */}
            <Card className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border-indigo-500/20 p-6 rounded-2xl">
              <h3 className="text-lg font-semibold text-indigo-300 flex items-center mb-4">
                <span className="mr-2">✨</span> AI Insights
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Data Not Available. As more data points (like historical cutoffs, real-time fee updates, and student reviews) are integrated, our AI engine will generate personalized insights regarding your chances, ROI, and comparative advantages of joining {college.short_name || 'this institution'}.
              </p>
            </Card>
          </div>
        )}

        {/* Cutoffs Section */}
        {activeTab === 'cutoffs' && (
          <div className="space-y-8 animate-fade-in-up">
            <h2 className="text-2xl font-bold">Cutoffs & Admission Trends</h2>
            <Card className="bg-[#141a24] border-gray-800 p-6 rounded-2xl">
              <h3 className="text-lg font-medium mb-4 text-gray-200">Historical Cutoff Trends (Top Categories)</h3>
              <CutoffTrends cutoffs={cutoffs} />
            </Card>
            
            <Card className="bg-[#141a24] border-gray-800 p-6 rounded-2xl">
              {cutoffs && cutoffs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-300">
                    <thead className="text-xs uppercase bg-gray-800/50 text-gray-400">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Year</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Round</th>
                        <th className="px-4 py-3">AIQ Rank</th>
                        <th className="px-4 py-3 rounded-tr-lg">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {cutoffs.slice(0, 20).map((c: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-3">{c.year}</td>
                          <td className="px-4 py-3 font-medium text-white">{c.category}</td>
                          <td className="px-4 py-3">{c.round_name}</td>
                          <td className="px-4 py-3">{c.aiq_rank ? c.aiq_rank.toLocaleString() : '-'}</td>
                          <td className="px-4 py-3">{c.aiq_score || c.score || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {cutoffs.length > 20 && (
                    <div className="mt-4 text-center text-sm text-gray-500">
                      Showing top 20 historical cutoff records...
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Data Not Available for this college.
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Fees & Seats Section */}
        {activeTab === 'fees' && (
          <div className="space-y-8 animate-fade-in-up">
            <h2 className="text-2xl font-bold">Fees & Seat Matrix</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-[#141a24] border-gray-800 p-6 rounded-2xl">
                <h3 className="text-lg font-medium mb-4 text-gray-200">Fee Structure</h3>
                {fees && fees.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-800">
                      <span className="text-gray-400">Annual Tuition Fee</span>
                      <span className="font-medium text-white">₹{fees[0].tuition_annual?.toLocaleString('en-IN') || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-800">
                      <span className="text-gray-400">Hostel Fee</span>
                      <span className="font-medium text-white">₹{fees[0].hostel_annual?.toLocaleString('en-IN') || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-800">
                      <span className="text-gray-400">Bond Amount</span>
                      <span className="font-medium text-white">₹{fees[0].bond_amount?.toLocaleString('en-IN') || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-800">
                      <span className="text-gray-400">Bond Years</span>
                      <span className="font-medium text-white">{fees[0].bond_years || '-'} Years</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">Data Not Available</div>
                )}
              </Card>

              <Card className="bg-[#141a24] border-gray-800 p-6 rounded-2xl">
                <h3 className="text-lg font-medium mb-4 text-gray-200">Seat Distribution</h3>
                {seatMatrix && seatMatrix.length > 0 ? (
                  <div className="space-y-4">
                    {seatMatrix.slice(0, 5).map((s: any, i: number) => (
                      <div key={i} className="flex justify-between items-center bg-gray-800/30 p-3 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-white">{s.category_code || s.category}</div>
                          <div className="text-xs text-gray-400">{s.quota_code || s.quota}</div>
                        </div>
                        <div className="text-lg font-bold text-orange-500">
                          {s.total_seats}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">Data Not Available</div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* Facilities & Reviews Stubs */}
        {activeTab === 'facilities' && (
          <div className="space-y-8 animate-fade-in-up">
            <h2 className="text-2xl font-bold">Facilities & Faculty</h2>
            <Card className="bg-[#141a24] border-gray-800 p-12 rounded-2xl flex flex-col items-center justify-center text-center">
              <Building className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-xl font-medium text-gray-300 mb-2">Information Coming Soon</h3>
              <p className="text-gray-500 max-w-md">
                Data Not Available. We are currently verifying and aggregating facility and faculty details for {college.name}.
              </p>
            </Card>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-8 animate-fade-in-up">
            <h2 className="text-2xl font-bold">Student Reviews</h2>
            <Card className="bg-[#141a24] border-gray-800 p-12 rounded-2xl flex flex-col items-center justify-center text-center">
              <div className="flex space-x-1 mb-4 text-gray-700">
                {[1,2,3,4,5].map((i) => <span key={i}>★</span>)}
              </div>
              <h3 className="text-xl font-medium text-gray-300 mb-2">No Reviews Yet</h3>
              <p className="text-gray-500 max-w-md">
                Data Not Available. Be the first to share your experience studying at {college.name}.
              </p>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
