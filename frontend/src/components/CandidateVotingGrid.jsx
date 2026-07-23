import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Loader2, Vote as VoteIcon } from 'lucide-react';

/**
 * EP-133/136/138: Candidate Voting Grid
 * Displays candidate cards for a category, lets a user cast one vote,
 * then locks the UI (grayscale + disabled buttons + success banner).
 *
 * Props:
 *  - eventId: string
 *  - category: string  (e.g. "Best Costume")
 */
export default function CandidateVotingGrid({ eventId, category }) {
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // EP-138: post-vote locked state
  const [hasVoted, setHasVoted] = useState(false);
  const [votedCandidateId, setVotedCandidateId] = useState(null);
  const [votingCandidateId, setVotingCandidateId] = useState(null); // in-flight spinner

  const loggedInUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  })();

  const fetchCandidates = useCallback(async () => {
    try {
      const res = await fetch(`/api/vote/candidates/${eventId}/${encodeURIComponent(category)}`);
      const data = await res.json();
      if (data.success) setCandidates(data.data);
    } catch (err) {
      console.error('Error fetching candidates:', err);
      setError('Could not load candidates.');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, category]);

  // EP-138: restore the locked state on load if this user already voted
  const fetchVoteStatus = useCallback(async () => {
    if (!loggedInUser.id) return;
    try {
      const res = await fetch(`/api/vote/status/${eventId}/${encodeURIComponent(category)}/${loggedInUser.id}`);
      const data = await res.json();
      if (data.success && data.hasVoted) {
        setHasVoted(true);
        setVotedCandidateId(data.votedCandidateId);
      }
    } catch (err) {
      console.error('Error fetching vote status:', err);
    }
  }, [eventId, category, loggedInUser.id]);

  useEffect(() => {
    fetchCandidates();
    fetchVoteStatus();
  }, [fetchCandidates, fetchVoteStatus]);

  const handleVote = async (candidateId) => {
    if (hasVoted || votingCandidateId) return;
    setVotingCandidateId(candidateId);

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          userId: loggedInUser.id,
          category,
          candidateId,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // EP-138: flip the UI to locked state immediately on 200 success
        setHasVoted(true);
        setVotedCandidateId(candidateId);
        setCandidates((prev) =>
          prev.map((c) => (c._id === candidateId ? { ...c, totalVotes: data.data.totalVotes } : c))
        );
      } else {
        setError(data.message || 'Vote could not be recorded.');
        // If it failed because they already voted, sync the locked state anyway
        if (res.status === 409) {
          fetchVoteStatus();
        }
      }
    } catch (err) {
      console.error('Vote error:', err);
      setError('Network error casting your vote.');
    } finally {
      setVotingCandidateId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading candidates...
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* EP-138: Success banner shown once locked */}
      {hasVoted && (
        <div className="flex items-center gap-2.5 mb-5 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-bold text-emerald-300">Vote Successfully Recorded</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-400 mb-4">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {candidates.map((candidate) => {
          const isThisVoted = votedCandidateId === candidate._id;
          const isVotingNow = votingCandidateId === candidate._id;

          return (
            <div
              key={candidate._id}
              className={`rounded-2xl border overflow-hidden transition-all duration-500 ${
                hasVoted
                  ? 'grayscale opacity-70 border-white/[0.06]'
                  : 'border-white/[0.08] hover:border-indigo-500/40'
              } ${isThisVoted ? '!grayscale-0 !opacity-100 border-emerald-500/40 ring-2 ring-emerald-500/20' : ''}`}
            >
              <div className="aspect-square w-full bg-white/[0.03] overflow-hidden">
                <img
                  src={candidate.photoUrl || 'https://via.placeholder.com/300x300?text=No+Photo'}
                  alt={candidate.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-4 flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{candidate.name}</h3>
                 {isThisVoted && (
  <p className="text-[0.65rem] text-emerald-400 font-semibold mt-0.5 flex items-center gap-1 animate-pulse">
    <CheckCircle2 className="w-3 h-3" /> Your vote
  </p>
)}
                </div>

                <button
                  onClick={() => handleVote(candidate._id)}
                  disabled={hasVoted || isVotingNow}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    hasVoted
                      ? 'bg-white/[0.03] text-slate-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90'
                  }`}
                >
                  {isVotingNow ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <VoteIcon className="w-4 h-4" />
                  )}
                  {isVotingNow ? 'Submitting...' : hasVoted ? 'Voted' : 'Vote for Me'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {candidates.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-10">No candidates in this category yet.</p>
      )}
    </div>
  );
}