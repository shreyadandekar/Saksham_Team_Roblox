/**
 * src/components/custody/CustodyCard.tsx
 * Card component for displaying physical custody status, receipt records, physical location,
 * chronological custody events, and an officer-only custody update form.
 */

import { useState } from "react";
import {
  ShieldCheck,
  MapPin,
  Calendar,
  User,
  History,
  PlusCircle,
  AlertTriangle,
  FileCheck2,
  Lock,
} from "lucide-react";
import type {
  CurrentCustodyState,
  CustodyEvent,
  CustodyEventType,
  RecordCustodyEventInput,
} from "../../types/custody";
import { recordCustodyEvent } from "../../api/custody";
import { formatDate, formatDateTime } from "../../utils/format";

interface CustodyCardProps {
  instrumentId: string;
  currentCustody: CurrentCustodyState | null;
  events: CustodyEvent[];
  isOfficerOrAdmin: boolean;
  onEventRecorded: () => Promise<void>;
}

export default function CustodyCard({
  instrumentId,
  currentCustody,
  events,
  isOfficerOrAdmin,
  onEventRecorded,
}: CustodyCardProps) {
  const [showForm, setShowForm] = useState(false);
  const [eventType, setEventType] = useState<CustodyEventType>("LOCATION_UPDATED");
  const [physicalLocation, setPhysicalLocation] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const statusColors: Record<string, string> = {
    PENDING_RECEIPT: "bg-amber-100 text-amber-800 border-amber-200",
    IN_CUSTODY: "bg-emerald-100 text-emerald-800 border-emerald-200",
    RELEASED: "bg-blue-100 text-blue-800 border-blue-200",
    TRANSFERRED: "bg-purple-100 text-purple-800 border-purple-200",
    DISCREPANCY: "bg-rose-100 text-rose-800 border-rose-200",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const payload: RecordCustodyEventInput = {
        eventType,
        physicalLocation: physicalLocation.trim() || undefined,
        remarks: remarks.trim() || undefined,
      };

      const res = await recordCustodyEvent(instrumentId, payload);
      setSuccess(res.message);
      setShowForm(false);
      setPhysicalLocation("");
      setRemarks("");
      await onEventRecorded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record custody event.");
    } finally {
      setLoading(false);
    }
  }

  const custodyStatus = currentCustody?.custodyStatus || "PENDING_RECEIPT";
  const badgeClass = statusColors[custodyStatus] || "bg-slate-100 text-slate-800 border-slate-200";

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-indigo-700" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Physical Custody & Vault Location
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}
          >
            {custodyStatus.replace(/_/g, " ")}
          </span>

          {isOfficerOrAdmin && !showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setError(null);
                setSuccess(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-xs font-semibold transition-colors cursor-pointer"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Record Custody Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Success / Error Messages */}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <FileCheck2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Snapshot Information Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Original Physical Received
          </span>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-800">
            {currentCustody?.originalReceived ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <FileCheck2 className="h-3.5 w-3.5" /> Yes (In AICTE Custody)
              </span>
            ) : (
              <span className="text-amber-700 flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" /> No (Pending Receipt)
              </span>
            )}
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Receipt Date
          </span>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-800">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>
              {currentCustody?.originalReceivedAt
                ? formatDate(currentCustody.originalReceivedAt)
                : "Not Recorded"}
            </span>
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Receiving Officer
          </span>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-800">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span className="truncate">
              {currentCustody?.receivingOfficer
                ? currentCustody.receivingOfficer.fullName
                : "None"}
            </span>
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Current Physical Vault Location
          </span>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-800">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-mono font-medium">
              {currentCustody?.physicalLocation || "Not Assigned"}
            </span>
          </div>
        </div>
      </div>

      {/* Officer Record Form Modal / Collapsible Section */}
      {showForm && isOfficerOrAdmin && (
        <form
          onSubmit={handleSubmit}
          className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-200 space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              <PlusCircle className="h-4 w-4 text-indigo-700" />
              Record Physical Custody Transition
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custody Action / Event Type *
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as CustodyEventType)}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="ORIGINAL_RECEIVED">ORIGINAL RECEIVED (First-time intake)</option>
                <option value="LOCATION_UPDATED">LOCATION UPDATED (Move / Vault reassignment)</option>
                <option value="CUSTODY_CONFIRMED">CUSTODY CONFIRMED (Physical audit count)</option>
                <option value="ORIGINAL_RELEASED">ORIGINAL RELEASED (Handover to institution)</option>
                <option value="DISCREPANCY_FLAGGED">DISCREPANCY FLAGGED (Missing / Mismatch)</option>
                <option value="OTHER">OTHER (General custody note)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vault / Storage Location (e.g., Vault B, Cabinet 4, Shelf 2)
              </label>
              <input
                type="text"
                value={physicalLocation}
                onChange={(e) => setPhysicalLocation(e.target.value)}
                placeholder="AICTE HQ Vault Room, Rack 3, Locker 12"
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Inspection Observation / Custody Remarks
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Provide context regarding physical certificate verification, serial check, or dispatch..."
              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer"
            >
              {loading ? "Recording..." : "Save Custody Event"}
            </button>
          </div>
        </form>
      )}

      {/* Custody History Log */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <History className="h-3.5 w-3.5 text-slate-500" />
            Physical Custody Event History
          </h3>
          <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
            {events.length} Recorded Action{events.length === 1 ? "" : "s"}
          </span>
        </div>

        {events.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
            No physical custody actions have been recorded yet for this instrument.
          </p>
        ) : (
          <div className="space-y-2">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="p-3 bg-slate-50 hover:bg-slate-100/70 transition-colors rounded-lg border border-slate-200 text-xs space-y-1.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-900">
                      {ev.eventType}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${
                        statusColors[ev.custodyStatusAfter] || "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      &rarr; {ev.custodyStatusAfter.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {formatDateTime(ev.eventTimestamp || ev.createdAt)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 text-[11px]">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-slate-400" />
                    <span>Officer:</span>
                    <span className="font-semibold text-slate-800">
                      {ev.recordedByUser?.fullName || "AICTE Officer"}
                    </span>
                  </div>

                  {ev.physicalLocation && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <span>Vault:</span>
                      <span className="font-mono text-slate-800 font-semibold">
                        {ev.physicalLocation}
                      </span>
                    </div>
                  )}
                </div>

                {ev.remarks && (
                  <p className="text-slate-600 italic bg-white p-2 rounded border border-slate-100 mt-1">
                    &ldquo;{ev.remarks}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
