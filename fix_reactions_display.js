const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add reaction display after each message bubble - DM version
code = code.replace(
  `                        {msg.image_url?<img src={msg.image_url} style={{maxWidth:220,maxHeight:220,borderRadius:14,display:'block'}} alt="img"/>:msg.content}
                        <div style={{fontSize:10,color:own?'rgba(255,255,255,0.45)':'#444',marginTop:4,textAlign:'right',padding:msg.image_url?'0 8px 6px':'0'}}>{timeAgo(msg.created_at)}</div>
                      </div>
                    )}
                  </div>
                </div>)
              })}`,
  `                        {msg.image_url?<img src={msg.image_url} style={{maxWidth:220,maxHeight:220,borderRadius:14,display:'block'}} alt="img"/>:msg.content}
                        <div style={{fontSize:10,color:own?'rgba(255,255,255,0.45)':'#444',marginTop:4,textAlign:'right',padding:msg.image_url?'0 8px 6px':'0'}}>{timeAgo(msg.created_at)}</div>
                      </div>
                    )}
                    {msg.reactions?.length>0&&<div style={{display:'flex',gap:2,marginTop:2,justifyContent:own?'flex-end':'flex-start'}}>
                      {msg.reactions.map((r,i)=><span key={i} style={{background:'rgba(255,255,255,0.1)',borderRadius:10,padding:'2px 6px',fontSize:12}}>{r.emoji}</span>)}
                    </div>}
                  </div>
                </div>)
              })}`
);

// Add reaction display for group chat
code = code.replace(
  `                    {msg.image_url?<img src={msg.image_url} style={{maxWidth:220,maxHeight:220,borderRadius:14,display:'block'}} alt="img"/>:msg.content}
                    <div style={{fontSize:10,color:own?'rgba(255,255,255,0.45)':'#444',marginTop:4,textAlign:'right',padding:msg.image_url?'0 8px 6px':'0'}}>{timeAgo(msg.created_at)}</div>
                  </div>
                )}
              </div>
            </div>
          )
        })}`,
  `                    {msg.image_url?<img src={msg.image_url} style={{maxWidth:220,maxHeight:220,borderRadius:14,display:'block'}} alt="img"/>:msg.content}
                    <div style={{fontSize:10,color:own?'rgba(255,255,255,0.45)':'#444',marginTop:4,textAlign:'right',padding:msg.image_url?'0 8px 6px':'0'}}>{timeAgo(msg.created_at)}</div>
                  </div>
                )}
                {msg.reactions?.length>0&&<div style={{display:'flex',gap:2,marginTop:2,justifyContent:own?'flex-end':'flex-start'}}>
                  {msg.reactions.map((r,i)=><span key={i} style={{background:'rgba(255,255,255,0.1)',borderRadius:10,padding:'2px 6px',fontSize:12}}>{r.emoji}</span>)}
                </div>}
              </div>
            </div>
          )
        })}`
);

// Also fix group chat reaction button to use reactions array
code = code.replace(
  `{['👍','❤️','😂','😮','😢','🔥','👏','💯'].map(e=>(
                <button key={e} onClick={async()=>{await supabase.from('group_messages').update({content:selectedMsg.content+' '+e}).eq('id',selectedMsg.id);setMessages(prev=>prev.map(m=>m.id===selectedMsg.id?{...m,content:m.content+' '+e}:m));setSelectedMsg(null)}} style={{background:'rgba(255,255,255,0.08)',border:'none',borderRadius:12,padding:'8px',fontSize:22,cursor:'pointer'}}>{e}</button>
              ))}`,
  `{['👍','❤️','😂','😮','😢','🔥','👏','💯'].map(e=>(
                <button key={e} onClick={async()=>{
                  const newReactions = [...(selectedMsg.reactions||[]),{emoji:e,user_id:currentUser.id}]
                  await supabase.from('group_messages').update({reactions:newReactions}).eq('id',selectedMsg.id)
                  setMessages(prev=>prev.map(m=>m.id===selectedMsg.id?{...m,reactions:newReactions}:m))
                  setSelectedMsg(null)
                }} style={{background:'rgba(255,255,255,0.08)',border:'none',borderRadius:12,padding:'8px',fontSize:22,cursor:'pointer'}}>{e}</button>
              ))}`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
