"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { deriveKey, encryptMessage, decryptMessage, getRoomPassphrase } from "@/lib/crypto";

interface ChatRoom {
    id: string;
    freelancer_id: string;
    created_at: string;
    profiles?: { full_name: string; email: string };
}

interface Message {
    id: string;
    room_id: string;
    sender_id: string;
    encrypted_content: string;
    created_at: string;
    decrypted?: string;
}

export default function ChatHubPage() {
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    useEffect(() => {
        fetchRooms();
    }, []);

    useEffect(() => {
        if (!selectedRoom) return;
        initCrypto(selectedRoom.id);
        fetchMessages(selectedRoom.id);

        const channel = supabase
            .channel(`chat-${selectedRoom.id}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${selectedRoom.id}` }, async (payload) => {
                const msg = payload.new as Message;
                if (cryptoKey) {
                    try {
                        msg.decrypted = await decryptMessage(msg.encrypted_content, cryptoKey);
                    } catch {
                        msg.decrypted = "[Decryption failed]";
                    }
                }
                setMessages((prev) => [...prev, msg]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [selectedRoom]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function fetchRooms() {
        setLoading(true);
        const { data, error } = await supabase
            .from("chat_rooms")
            .select("*, profiles(full_name, email)")
            .order("created_at", { ascending: false });

        if (error) {
            console.warn("Primary join failed, trying fallback:", error.message);
            const { data: roomsOnly } = await supabase.from("chat_rooms").select("*").order("created_at", { ascending: false });
            if (roomsOnly) {
                const freelancerIds = roomsOnly.map(r => r.freelancer_id);
                const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", freelancerIds);
                const combined = roomsOnly.map(room => ({
                    ...room,
                    profiles: profiles?.find(p => p.id === room.freelancer_id)
                }));
                setRooms(combined as ChatRoom[]);
            }
        } else if (data) {
            console.log("Rooms data received:", data);
            setRooms(data as ChatRoom[]);
        }
        setLoading(false);
    }

    async function initCrypto(roomId: string) {
        const passphrase = getRoomPassphrase(roomId);
        const key = await deriveKey(passphrase);
        setCryptoKey(key);
    }

    async function fetchMessages(roomId: string) {
        const { data, error } = await supabase
            .from("messages")
            .select("*")
            .eq("room_id", roomId)
            .order("created_at", { ascending: true });

        if (error) console.error("Error fetching messages:", error);

        if (data && cryptoKey) {
            const decrypted = await Promise.all(
                data.map(async (msg: Message) => {
                    try {
                        msg.decrypted = await decryptMessage(msg.encrypted_content, cryptoKey);
                    } catch (err) {
                        console.error("Decryption failed for msg:", msg.id, err);
                        msg.decrypted = "[Decryption failed]";
                    }
                    return msg;
                })
            );
            setMessages(decrypted);
        } else if (data) {
            setMessages(data);
        }
    }

    // Re-decrypt when key becomes available or messages change
    useEffect(() => {
        if (!cryptoKey || messages.length === 0) return;

        const undecrypted = messages.filter(msg => !msg.decrypted || msg.decrypted === "[Decryption failed]");
        if (undecrypted.length === 0) return;

        (async () => {
            const newMessages = await Promise.all(
                messages.map(async (msg) => {
                    if (msg.decrypted && msg.decrypted !== "[Decryption failed]") return msg;
                    try {
                        const decrypted = await decryptMessage(msg.encrypted_content, cryptoKey);
                        return { ...msg, decrypted };
                    } catch (err) {
                        console.error("Decryption error for msg:", msg.id, err);
                        return { ...msg, decrypted: "[Decryption failed]" };
                    }
                })
            );

            // Only update if something actually changed to avoid infinite loops
            const hasChanged = newMessages.some((m, i) => m.decrypted !== messages[i].decrypted);
            if (hasChanged) {
                setMessages(newMessages);
            }
        })();
    }, [cryptoKey, messages]);

    async function sendMessage() {
        if (!newMessage.trim() || !selectedRoom || !cryptoKey) {
            console.log("Cannot send: missing data", { hasRoom: !!selectedRoom, hasKey: !!cryptoKey });
            return;
        }
        setSending(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setSending(false); return; }

            const encrypted = await encryptMessage(newMessage.trim(), cryptoKey);
            const { error } = await supabase.from("messages").insert({
                room_id: selectedRoom.id,
                sender_id: user.id,
                encrypted_content: encrypted,
            });
            if (error) console.error("Send error:", error);
        } catch (err) {
            console.error("Message send failure:", err);
        }

        setNewMessage("");
        setSending(false);
    }

    return (
        <div className="animate-fade-in" style={{ height: "calc(100vh - 64px)" }}>
            <div style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "4px" }}>Chat Hub</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                    End-to-End Encrypted conversations with freelancers
                </p>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "280px 1fr",
                    gap: "16px",
                    height: "calc(100vh - 160px)",
                }}
            >
                {/* Rooms Sidebar */}
                <div
                    style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "16px",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <div style={{ padding: "16px", borderBottom: "1px solid var(--border-subtle)", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
                        💬 Active Rooms ({rooms.length})
                    </div>
                    <div style={{ flex: 1, overflowY: "auto" }}>
                        {loading ? (
                            <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>Loading...</div>
                        ) : rooms.length === 0 ? (
                            <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>No chat rooms yet</div>
                        ) : (
                            rooms.map((room) => (
                                <div
                                    key={room.id}
                                    onClick={() => setSelectedRoom(room)}
                                    style={{
                                        padding: "14px 16px",
                                        cursor: "pointer",
                                        borderBottom: "1px solid var(--border-subtle)",
                                        background: selectedRoom?.id === room.id ? "rgba(59,130,246,0.1)" : "transparent",
                                        borderLeft: selectedRoom?.id === room.id ? "3px solid var(--accent-blue)" : "3px solid transparent",
                                        transition: "all 0.15s",
                                    }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>
                                        {room.profiles?.full_name || "Freelancer"}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                                        {room.profiles?.email || room.freelancer_id.slice(0, 8)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div
                    style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "16px",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                    }}
                >
                    {!selectedRoom ? (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
                            <div style={{ fontSize: "56px" }}>🔒</div>
                            <div style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Select a room to start chatting</div>
                            <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>Messages are end-to-end encrypted</div>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#fff", fontWeight: 700 }}>
                                    {(selectedRoom.profiles?.full_name || "?")[0].toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: "14px" }}>
                                        {selectedRoom.profiles?.full_name || "Freelancer"}
                                    </div>
                                    <div style={{ fontSize: "11px", color: "var(--accent-emerald)", display: "flex", alignItems: "center", gap: "4px" }}>
                                        🔒 End-to-End Encrypted
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                {messages.map((msg) => {
                                    const isAdmin = msg.sender_id !== selectedRoom.freelancer_id;
                                    return (
                                        <div
                                            key={msg.id}
                                            style={{
                                                display: "flex",
                                                justifyContent: isAdmin ? "flex-end" : "flex-start",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    maxWidth: "70%",
                                                    padding: "10px 16px",
                                                    borderRadius: isAdmin ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                                                    background: isAdmin
                                                        ? "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))"
                                                        : "var(--bg-secondary)",
                                                    color: isAdmin ? "#fff" : "var(--text-primary)",
                                                    fontSize: "14px",
                                                    lineHeight: 1.5,
                                                }}
                                            >
                                                {msg.decrypted || "🔐 Encrypted"}
                                                <div style={{ fontSize: "10px", marginTop: "4px", opacity: 0.6, textAlign: "right" }}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: "10px" }}>
                                <input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                                    placeholder="Type a message..."
                                    style={{
                                        flex: 1,
                                        background: "var(--bg-secondary)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "12px",
                                        padding: "12px 16px",
                                        color: "var(--text-primary)",
                                        fontSize: "14px",
                                        outline: "none",
                                    }}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={sending || !newMessage.trim()}
                                    style={{
                                        background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                                        border: "none",
                                        borderRadius: "12px",
                                        padding: "12px 20px",
                                        color: "#fff",
                                        fontSize: "14px",
                                        fontWeight: 600,
                                        cursor: sending ? "wait" : "pointer",
                                        opacity: !newMessage.trim() ? 0.5 : 1,
                                    }}
                                >
                                    Send
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
