"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, EyeOff, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { adminApi, type BadWord, type FlaggedComment } from "@/lib/admin-client";

export default function AdminModerationPage() {
  const [tab, setTab] = useState<"COMMENTS"|"BADWORDS">("COMMENTS");
  const [comments,setComments] = useState<FlaggedComment[]>([]);
  const [badwords,setBadwords] = useState<BadWord[]>([]);
  const [word,setWord] = useState("");
  const [category,setCategory] = useState("PROFANITY");
  const [loading,setLoading] = useState(true);
  const [workingId,setWorkingId] = useState("");
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { const [commentData,wordData] = await Promise.all([adminApi.comments(),adminApi.badwords()]); setComments(commentData.comments); setBadwords(wordData); }
    catch(cause){ setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu kiểm duyệt"); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ void load(); },[]);
  const flash=(text:string)=>{setMessage(text);window.setTimeout(()=>setMessage(""),3500);};
  const moderate=async(comment:FlaggedComment,action:"APPROVE"|"HIDE")=>{setWorkingId(comment.id);setError("");try{await adminApi.moderateComment(comment.id,action);setComments(items=>items.filter(item=>item.id!==comment.id));flash(action==="APPROVE"?"Đã duyệt bình luận.":"Đã ẩn bình luận và xử lý báo cáo liên quan.");}catch(cause){setError(cause instanceof Error?cause.message:"Kiểm duyệt thất bại");}finally{setWorkingId("");}};
  const addWord=async(event:FormEvent)=>{event.preventDefault();if(!word.trim())return;setError("");try{const created=await adminApi.addBadword(word.trim(),category);setBadwords(items=>[created,...items.filter(item=>item.id!==created.id)]);setWord("");flash(`Đã thêm “${created.pattern}”.`);}catch(cause){setError(cause instanceof Error?cause.message:"Thêm từ cấm thất bại");}};
  const removeWord=async(item:BadWord)=>{setWorkingId(item.id);setError("");try{await adminApi.deleteBadword(item.id);setBadwords(items=>items.filter(wordItem=>wordItem.id!==item.id));flash(`Đã xóa “${item.pattern}”.`);}catch(cause){setError(cause instanceof Error?cause.message:"Xóa từ cấm thất bại");}finally{setWorkingId("");}};

  return <div className="space-y-6 max-w-7xl mx-auto">
    <div><h1 className="text-2xl font-extrabold">Kiểm duyệt & từ cấm</h1><p className="text-sm text-gray-500 mt-1">Xử lý hàng đợi báo cáo và cấu hình bộ lọc từ PostgreSQL.</p></div>
    {message&&<div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-sm">{message}</div>}{error&&<div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
    <div className="flex border-b"><button onClick={()=>setTab("COMMENTS")} className={`px-4 py-3 text-sm font-bold ${tab==="COMMENTS"?"border-b-2 border-amber-400":"text-gray-500"}`}>Hàng đợi ({comments.length})</button><button onClick={()=>setTab("BADWORDS")} className={`px-4 py-3 text-sm font-bold ${tab==="BADWORDS"?"border-b-2 border-amber-400":"text-gray-500"}`}>Từ cấm ({badwords.length})</button></div>
    {loading ? <div className="p-12 text-center text-sm text-gray-500">Đang tải...</div> : tab==="COMMENTS" ? <section className="space-y-4">{comments.length===0?<Empty icon={<CheckCircle2/>} title="Không có bình luận cần xử lý"/>:comments.map(comment=><article key={comment.id} className="bg-white border rounded-2xl p-5 space-y-4"><div className="flex justify-between gap-4"><div><p className="font-bold">{comment.author.profile?.fullName||comment.author.email}</p><p className="text-xs text-gray-500">{comment.author.email} · {new Date(comment.createdAt).toLocaleString("vi-VN")}</p></div><span className="bg-red-100 text-red-700 rounded-full px-2 py-1 h-fit text-xs font-bold">{comment.status}</span></div><blockquote className="border-l-4 border-red-300 bg-red-50 p-3 text-sm">{comment.content}</blockquote><div className="text-xs text-gray-600"><strong>Báo cáo:</strong> {comment.reports.map(report=>report.reason).join("; ")||"Được đánh dấu bởi hệ thống"}</div><details className="text-xs text-gray-500"><summary className="cursor-pointer font-semibold">Xem bài viết gốc</summary><p className="mt-2 p-3 bg-gray-50 rounded-lg">{comment.post.content}</p></details><div className="flex justify-end gap-2"><button disabled={workingId===comment.id} onClick={()=>void moderate(comment,"APPROVE")} className="px-3 py-2 border rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle2 size={14}/>Duyệt</button><button disabled={workingId===comment.id} onClick={()=>void moderate(comment,"HIDE")} className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"><EyeOff size={14}/>Ẩn</button></div></article>)}</section>:
    <section className="grid lg:grid-cols-[340px_1fr] gap-5"><form onSubmit={addWord} className="bg-white border rounded-2xl p-5 space-y-4 h-fit"><h2 className="font-bold flex gap-2"><Plus size={18}/>Thêm từ cấm</h2><input value={word} onChange={e=>setWord(e.target.value)} placeholder="Từ hoặc cụm từ" className="w-full border rounded-xl p-3 text-sm"/><select value={category} onChange={e=>setCategory(e.target.value)} className="w-full border rounded-xl p-3 text-sm"><option>PROFANITY</option><option>SCAM</option><option>HARASSMENT</option><option>OFFENSIVE</option></select><button className="w-full bg-[#FFD027] rounded-xl py-2.5 text-sm font-bold">Thêm vào bộ lọc</button></form><div className="bg-white border rounded-2xl overflow-hidden"><div className="divide-y">{badwords.length===0?<Empty icon={<ShieldAlert/>} title="Chưa có từ cấm"/>:badwords.map(item=><div key={item.id} className="p-4 flex items-center justify-between gap-3"><div><p className="font-bold text-sm">{item.pattern}</p><p className="text-xs text-gray-500">{item.category} · {item.isActive?"Đang bật":"Đã tắt"}</p></div><button disabled={workingId===item.id} onClick={()=>void removeWord(item)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" aria-label={`Xóa ${item.pattern}`}><Trash2 size={16}/></button></div>)}</div></div></section>}
  </div>;
}

function Empty({icon,title}:{icon:React.ReactNode;title:string}){return <div className="bg-white border rounded-2xl p-12 text-center text-gray-500"><div className="flex justify-center mb-2">{icon}</div><p className="text-sm font-bold">{title}</p></div>}
