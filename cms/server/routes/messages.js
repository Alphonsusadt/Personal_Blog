import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { authMiddleware } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { Resend } from 'resend';

// Custom sync helper for messages
async function saveMessage(db, messageData, originalId = null) {
  const col = db.collection('messages');
  
  // 1. Save to MongoDB
  let mongoResult;
  if (originalId) {
    // Update existing based on string id
    mongoResult = await col.updateOne(
      { id: originalId },
      { $set: { ...messageData, updatedAt: new Date() } },
      { upsert: true }
    );
  } else {
    // Insert new
    mongoResult = await col.insertOne({
      ...messageData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // 2. Save to Supabase (if configured)
  let supabaseResult = { success: false };
  if (supabase) {
    try {
      // Structure fields to match exactly the Supabase SQL schema in contect_cms.md:
      // name, email, subject, body, status, original_message_id, thread_id
      const sbData = {
        name: messageData.name || "Anonim",
        email: messageData.email || "",
        subject: messageData.subject || "",
        body: messageData.body || "",
        status: messageData.status || "unread",
        original_message_id: messageData.id, // MongoDB string id mapping
        thread_id: messageData.thread_id || ""
      };

      if (originalId) {
        // Update in Supabase based on original_message_id mapping
        const { data, error } = await supabase
          .from('messages')
          .update(sbData)
          .eq('original_message_id', originalId)
          .select();
        if (error) throw error;
        supabaseResult = { success: true, data };
      } else {
        // Insert new in Supabase
        const { data, error } = await supabase
          .from('messages')
          .insert([sbData])
          .select();
        if (error) throw error;
        supabaseResult = { success: true, data };
      }
    } catch (err) {
      console.warn('[messages] Supabase sync failed:', err.message);
    }
  }

  return {
    mongo: true,
    supabase: supabaseResult.success,
    id: messageData.id
  };
}

// Resend client initializer (resilient to dot/space env format)
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY || process.env['RESEND.COM API KEY'];
  if (!apiKey || apiKey.trim() === '') {
    console.warn('⚠️ Resend API Key is not configured in cms/.env');
    return null;
  }
  const cleanKey = apiKey.trim().replace(/^['"]|['"]$/g, '');
  return new Resend(cleanKey);
}

// Outgoing email HTML template
function renderReplyEmailHtml(visitorName, originalMessage, replyText) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 20px; font-size: 20px; font-weight: 700; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">Portofolio Aditya — Tanggapan Pesan</h2>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">Halo <strong>${visitorName || 'Pengunjung'}</strong>,</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">Terima kasih telah menghubungi saya. Berikut adalah tanggapan untuk pesan Anda:</p>
      
      <div style="margin: 24px 0; padding: 18px; background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 6px;">
        <p style="color: #1e293b; font-size: 15px; line-height: 1.6; white-space: pre-wrap; margin: 0;">${replyText}</p>
      </div>

      <p style="color: #475569; font-size: 14px; margin-bottom: 0;">Salam hangat,</p>
      <p style="color: #0f172a; font-weight: 600; font-size: 15px; margin-top: 4px;">Alphonsus Aditya</p>

      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

      <div style="padding: 16px; background-color: #f1f5f9; border-radius: 8px; font-size: 13.5px; color: #64748b;">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #475569;">Pesan Asli Anda:</p>
        <blockquote style="margin: 0; padding-left: 12px; border-left: 2px solid #cbd5e1; font-style: italic; color: #475569; white-space: pre-wrap;">${originalMessage}</blockquote>
      </div>
      
      <p style="color: #94a3b8; font-size: 11px; margin-top: 32px; text-align: center; margin-bottom: 0;">
        Email dikirim secara otomatis dari Admin Dashboard Portofolio.
      </p>
    </div>
  `;
}

export default function messagesRoutes(db) {
  const router = Router();

  // 1. PUBLIC: Submit a message from the portfolio page
  router.post('/public', async (req, res) => {
    try {
      const { name, email, subject: customSubject, body, language } = req.body;

      // VALIDATION PRIORITY: Check if message body is present
      if (!body || body.trim() === "") {
        return res.status(400).json({ error: 'Isi pesan wajib diisi / Message content is required.' });
      }

      const activeLang = language === 'en' ? 'en' : 'id';
      
      // LOGIKA SUBJEK DEFAULT
      const defaultSubject = activeLang === 'en' ? 'Message from Website' : 'Pesan dari Website';
      const resolvedSubject = customSubject && customSubject.trim() !== '' ? customSubject.trim() : defaultSubject;

      // MODE LOGIC (BALAS vs BACA SAJA)
      const hasEmail = email && email.includes('@');
      const status = hasEmail ? 'pending_reply' : 'read_only';

      // Generate a unique ID for referencing the message
      const messageId = 'msg_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

      const messageDoc = {
        id: messageId,
        name: name && name.trim() !== '' ? name.trim() : 'Anonim',
        email: hasEmail ? email.trim() : null,
        subject: resolvedSubject,
        body: body.trim(),
        status: status,
        language: activeLang,
        replies: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await saveMessage(db, messageDoc);
      
      res.status(201).json({
        success: true,
        message: activeLang === 'en' ? 'Message sent successfully!' : 'Pesan berhasil dikirim!',
        messageId: result.id,
        status: status
      });
    } catch (error) {
      console.error('POST /api/messages/public error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 2. ADMIN: Retrieve all messages (sorted by newest)
  router.get('/', authMiddleware, async (_req, res) => {
    try {
      const col = db.collection('messages');
      const messages = await col.find().sort({ createdAt: -1 }).toArray();
      res.json(messages);
    } catch (error) {
      console.error('GET /api/messages error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 3. ADMIN: Send an email reply via Resend.com
  router.post('/:id/reply', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { senderEmail, messageText } = req.body;

      if (!senderEmail || !senderEmail.trim()) {
        return res.status(400).json({ error: 'Sender email is required.' });
      }
      if (!messageText || !messageText.trim()) {
        return res.status(400).json({ error: 'Reply text is required.' });
      }

      const col = db.collection('messages');
      
      // Support looking up by both ObjectId (_id) or custom string id (id)
      let query = { id: id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id: id }] };
      }
      
      const message = await col.findOne(query);
      if (!message) {
        return res.status(404).json({ error: 'Message not found.' });
      }

      if (!message.email) {
        return res.status(400).json({ error: 'Cannot reply to a message that has no email address (Read-Only).' });
      }

      // Initialize Resend Client
      const resend = getResendClient();
      if (!resend) {
        return res.status(500).json({ error: 'Resend.com mailer client is not configured on the server. Check your API key in cms/.env.' });
      }

      // Set outbound sender name
      const fromField = `Aditya <${senderEmail.trim()}>`;
      const toField = message.email;
      const bccField = senderEmail.trim(); // BCC back to sender!
      const subjectField = `Re: ${message.subject || 'Pesan'}`;
      const emailHtml = renderReplyEmailHtml(message.name, message.body, messageText.trim());

      console.log(`[Resend] Sending email From: ${fromField}, To: ${toField}, BCC: ${bccField}`);
      
      // Dispatch email via Resend
      const emailResult = await resend.emails.send({
        from: fromField,
        to: toField,
        bcc: bccField,
        subject: subjectField,
        html: emailHtml
      });

      if (emailResult.error) {
        console.error('[Resend] API Error:', emailResult.error);
        return res.status(500).json({ error: `Email failed to send: ${emailResult.error.message}` });
      }

      // Log reply payload in MongoDB & Supabase
      const newReply = {
        senderEmail: senderEmail.trim(),
        body: messageText.trim(),
        sentAt: new Date()
      };

      const updatedReplies = [...(message.replies || []), newReply];
      const updatedDoc = {
        ...message,
        status: 'replied',
        replies: updatedReplies,
        updatedAt: new Date()
      };

      // Strip original _id to prevent modification errors on save
      delete updatedDoc._id;

      await saveMessage(db, updatedDoc, message.id);

      res.json({
        success: true,
        message: 'Reply sent successfully!',
        emailId: emailResult.data?.id,
        reply: newReply
      });
    } catch (error) {
      console.error('POST /api/messages/:id/reply error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
