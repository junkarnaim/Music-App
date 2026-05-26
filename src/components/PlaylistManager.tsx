import { useState, FormEvent } from "react";
import { Playlist, Track } from "../types";
import { FolderHeart, Plus, Trash, Music, ListMusic, Check } from "lucide-react";

interface PlaylistManagerProps {
  playlists: Playlist[];
  tracks: Track[];
  currentTrack: Track | null;
  onSelectPlaylistId: (id: string | null) => void;
  selectedPlaylistId: string | null;
  onCreatePlaylist: (name: string) => void;
  onDeletePlaylist: (id: string) => void;
  onAddTrackToPlaylist: (playlistId: string, trackId: string) => void;
}

export default function PlaylistManager({
  playlists,
  tracks,
  currentTrack,
  onSelectPlaylistId,
  selectedPlaylistId,
  onCreatePlaylist,
  onDeletePlaylist,
  onAddTrackToPlaylist
}: PlaylistManagerProps) {
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showCreator, setShowCreator] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    onCreatePlaylist(newPlaylistName.trim());
    setNewPlaylistName("");
    setShowCreator(false);
  };

  const handleAddCurrentTrack = (playlistId: string) => {
    if (!currentTrack) return;
    onAddTrackToPlaylist(playlistId, currentTrack.id);
    
    setSuccessMsg(`Added "${currentTrack.title}" to playlist!`);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 1500);
  };

  return (
    <div className="w-full frosted-glass p-6 rounded-2xl space-y-6">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <ListMusic className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-semibold text-white tracking-wide">
            Your Playlists
          </h2>
        </div>
        
        <button
          id="btn-toggle-playlist-creator"
          onClick={() => setShowCreator(!showCreator)}
          className="p-1 px-2.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-white/80 hover:bg-white/10 hover:border-white/20 transition cursor-pointer flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          New List
        </button>
      </div>

      {/* Playlist Creator Form */}
      {showCreator && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            id="input-new-playlist-name"
            type="text"
            required
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            placeholder="e.g. Chill Coding, Late Study..."
            className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition"
          />
          <button
            id="btn-submit-new-playlist"
            type="submit"
            className="px-3 py-1.5 bg-white hover:opacity-90 text-black text-xs font-bold tracking-wide rounded-xl transition cursor-pointer shadow-md"
          >
            Create
          </button>
        </form>
      )}

      {/* Adding feedback messages */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-950/25 border border-emerald-500/10 p-2.5 rounded-xl text-emerald-300 text-[11px]">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Playlist list channels */}
      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {/* All Songs general option */}
        <button
          id="playlist-all-songs"
          onClick={() => onSelectPlaylistId(null)}
          className={`w-full text-left p-3 rounded-xl flex items-center justify-between border cursor-pointer transition ${
            selectedPlaylistId === null
              ? "bg-white/[0.04] border-white/10"
              : "bg-transparent border-transparent hover:bg-white/[0.01]"
          }`}
        >
          <div className="flex items-center gap-3">
            <Music className="w-4 h-4 text-white/40" />
            <div className="text-xs text-white font-medium">All Streaming Catalog</div>
          </div>
          <span className="text-[10px] font-mono text-white/30">{tracks.length} tracks</span>
        </button>

        {playlists.map((playlist) => {
          const isSelected = selectedPlaylistId === playlist.id;
          const count = playlist.trackIds.length;

          return (
            <div
              key={playlist.id}
              className={`group w-full p-3 rounded-xl flex items-center justify-between border transition ${
                isSelected
                  ? "bg-white/[0.04] border-white/10"
                  : "bg-transparent border-transparent hover:bg-white/[0.01]"
              }`}
            >
              {/* Click to filter select playlist */}
              <button
                id={`playlist-select-${playlist.id}`}
                onClick={() => onSelectPlaylistId(playlist.id)}
                className="flex-1 text-left flex items-center gap-3 cursor-pointer"
              >
                <FolderHeart className={`w-4 h-4 ${isSelected ? "text-indigo-400" : "text-white/40"}`} />
                <div className="text-xs font-medium text-white leading-tight truncate">
                  {playlist.name}
                </div>
              </button>

              <div className="flex items-center gap-2.5 select-none">
                <span className="text-[10px] font-mono text-white/30">{count} tracks</span>

                {/* Add current song to this custom playlist widget */}
                {currentTrack && !playlist.trackIds.includes(currentTrack.id) && (
                  <button
                    id={`btn-add-to-${playlist.id}`}
                    onClick={() => handleAddCurrentTrack(playlist.id)}
                    className="p-1 rounded bg-white/5 hover:bg-indigo-500/10 hover:text-indigo-400 text-white/30 text-[9px] transition font-mono cursor-pointer"
                    title="Add Current Song to this Playlist"
                  >
                    + Add
                  </button>
                )}

                {/* Trash delete button */}
                <button
                  id={`btn-delete-${playlist.id}`}
                  onClick={() => onDeletePlaylist(playlist.id)}
                  className="p-1 rounded text-white/20 hover:text-red-400 transition cursor-pointer"
                  title="Delete Playlist"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {playlists.length === 0 && (
          <div className="text-center py-6 text-xs text-white/25">
            No custom playlists created yet. Keep keys chill.
          </div>
        )}
      </div>
    </div>
  );
}
