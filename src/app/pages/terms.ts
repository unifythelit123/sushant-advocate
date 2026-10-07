import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ORG, PROFILE } from '../core/profile';
import { LEGAL_STYLES } from './legal-page.css';

@Component({
  selector: 'app-terms',
  imports: [RouterLink],
  template: `
    <article class="wrap page">
      <p class="eyebrow">{{ org.name }}</p>
      <h1>Terms of Use</h1>
      <p class="muted updated">Last updated: 7 October 2026</p>

      <p class="notice">
        <strong>Disclaimer.</strong> As per the rules of the Bar Council of India, advocates are not permitted to solicit work
        or advertise. This website is not an advertisement or solicitation. It is meant only for information about the
        Collective and for people who wish to join it or write to it of their own accord.
      </p>

      <h2>1. About this website</h2>
      <p>
        This website belongs to the {{ org.name }}, a professional and community initiative founded by {{ p.name }}.
        By using it, you agree to these terms.
      </p>

      <h2>2. No legal advice</h2>
      <p>
        Nothing on this website, and no message exchanged through it, is legal advice. Using the website, applying for
        membership or sending a message does not create an advocate and client relationship. For advice on a legal matter,
        consult a qualified advocate directly.
      </p>

      <h2>3. Membership</h2>
      <p>
        Membership of the Collective is at the discretion of its coordinators. Submitting an application does not
        guarantee membership. Please make sure the information you give is true and complete.
      </p>

      <h2>4. Your conduct</h2>
      <ul>
        <li>Be respectful in all messages. Abusive, discriminatory or threatening content is not allowed.</li>
        <li>Do not upload files that are harmful or that you do not have the right to share.</li>
        <li>Do not try to access other people's information or interfere with the website.</li>
      </ul>
      <p>We may close conversations or remove content that breaks these rules.</p>

      <h2>5. Content</h2>
      <p>
        Text, photographs and material on this website belong to the Collective or its founder unless stated otherwise,
        and may not be copied for commercial use without permission.
      </p>

      <h2>6. Availability</h2>
      <p>We try to keep the website available and accurate but cannot promise it will always be free of errors or interruptions.</p>

      <h2>7. Privacy</h2>
      <p>How we handle your information is explained in our <a routerLink="/privacy">Privacy Policy</a>.</p>

      <h2>8. Governing law and contact</h2>
      <p>
        These terms are governed by the laws of India, and courts at New Delhi have jurisdiction. Questions can be sent to
        <a [href]="'mailto:' + org.email">{{ org.email }}</a>.
      </p>
    </article>
  `,
  styles: LEGAL_STYLES,
})
export class TermsPage {
  protected org = ORG;
  protected p = PROFILE;
}
