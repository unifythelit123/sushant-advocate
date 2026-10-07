import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ORG, PROFILE } from '../core/profile';
import { LEGAL_STYLES } from './legal-page.css';

@Component({
  selector: 'app-privacy',
  imports: [RouterLink],
  template: `
    <article class="wrap page">
      <p class="eyebrow">{{ org.name }}</p>
      <h1>Privacy Policy</h1>
      <p class="muted updated">Last updated: 7 October 2026</p>

      <p>
        This policy explains what information the {{ org.name }} ("ALC", "we") collects through this website,
        why we collect it, and how it is protected. The website is maintained on behalf of {{ p.name }}, Founder of ALC.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li><strong>Membership application:</strong> name, current city, home state and city, profession, education, caste category, LinkedIn link, statement of purpose, expertise, past experience, contact number, email address, remarks, and your CV if you upload one.</li>
        <li><strong>Messages:</strong> anything you write to us through your private conversation on this website.</li>
        <li><strong>Account details:</strong> if you choose to sign in, your email address or phone number, and your name and photo where Google provides them.</li>
        <li><strong>Drafts:</strong> unfinished applications are saved in your own browser, and in your account if you have one, so you can continue later.</li>
      </ul>
      <p>We do not use advertising or tracking cookies. The website only stores what is needed to keep you signed in and to save your draft.</p>

      <h2>2. Why we use it</h2>
      <ul>
        <li>To consider your application to join the Collective and to respond to you.</li>
        <li>To send you emails about your application and replies to your messages.</li>
        <li>To organise mentorship, sessions and community activities you have shown interest in.</li>
      </ul>
      <p>Caste category is asked only to understand the communities the Collective reaches. It is optional to share any detail beyond the category, and it is never shown publicly.</p>

      <h2>3. Who can see it</h2>
      <p>
        Your application and messages are visible only to you and to the Collective's coordinators. We do not sell,
        rent or share your information with anyone for marketing. We disclose information only where the law requires it.
      </p>

      <h2>4. Where it is stored</h2>
      <p>
        Information is stored securely on Google Cloud and Firebase. Emails are sent from {{ org.email }} using Google's Gmail service.
        Access is protected by sign in and by security rules that limit each person to their own records.
      </p>

      <h2>5. How long we keep it</h2>
      <p>We keep applications and messages for as long as they are needed for the Collective's work, or until you ask us to delete them.</p>

      <h2>6. Your choices</h2>
      <ul>
        <li>You can submit an application without creating an account.</li>
        <li>You can ask to see, correct or delete your information at any time by writing to <a [href]="'mailto:' + org.email">{{ org.email }}</a>.</li>
        <li>You can stop receiving emails from us by replying with a request to do so.</li>
      </ul>

      <h2>7. Children</h2>
      <p>This website is meant for law students, lawyers and activists aged 18 and above.</p>

      <h2>8. Changes and contact</h2>
      <p>
        If this policy changes, the date at the top will change too. Questions can be sent to
        <a [href]="'mailto:' + org.email">{{ org.email }}</a>. See also our <a routerLink="/terms">Terms of Use</a>.
      </p>
    </article>
  `,
  styles: LEGAL_STYLES,
})
export class PrivacyPage {
  protected org = ORG;
  protected p = PROFILE;
}
