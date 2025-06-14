import SEO from '../components/common/SEO';
import Link from 'next/link';

export default function SecurityPolicy() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <SEO 
        title="Security Policy | Ranga"
        description="Our security policy and responsible vulnerability disclosure program"
        canonical="https://ranga-denim.com/security-policy"
      />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">Security Policy</h1>
          
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6">Responsible Disclosure</h2>
            <p className="mb-6 text-gray-700">
              At Ranga, we take the security of our systems seriously. Despite our best efforts, vulnerabilities may still exist.
              If you discover a vulnerability, we would like to know about it so we can take steps to address it. We encourage
              responsible disclosure of vulnerabilities following these guidelines:
            </p>
            
            <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-6">
              <li>Provide details of the vulnerability, including information needed to reproduce and validate the vulnerability</li>
              <li>Make a good faith effort to avoid privacy violations, destruction of data, and interruption or degradation of our services</li>
              <li>Do not access or modify data that does not belong to you</li>
              <li>Give us reasonable time to respond to your report before making any information public</li>
            </ul>
            
            <p className="text-gray-700 mb-6">
              Please report security issues by emailing <strong>security@ranga-denim.com</strong>. We will acknowledge receipt of 
              your vulnerability report and send you regular updates about our progress.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6">Our Commitments</h2>
            <p className="mb-6 text-gray-700">
              When working with us according to this policy, you can expect us to:
            </p>
            
            <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-6">
              <li>Respond to your report promptly, acknowledging receipt within 48 hours</li>
              <li>Provide an estimated timeframe for addressing the vulnerability</li>
              <li>Notify you when the vulnerability is fixed</li>
              <li>Not take legal action against you for security research conducted in accordance with this policy</li>
              <li>Recognize your contribution if you are the first to report a unique vulnerability, and your report triggers a code or configuration change</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-semibold mb-6">Scope</h2>
            <p className="mb-6 text-gray-700">
              This policy applies to all Ranga digital properties, including:
            </p>
            
            <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-6">
              <li>Our website: ranga-denim.com</li>
              <li>Our mobile applications</li>
              <li>Our API endpoints</li>
            </ul>
            
            <p className="text-gray-700 mb-6">
              The following test types are explicitly <strong>NOT</strong> authorized:
            </p>
            
            <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-6">
              <li>Network denial of service (DoS or DDoS) tests</li>
              <li>Physical security testing</li>
              <li>Social engineering attacks</li>
              <li>Tests on systems or applications not owned by us</li>
            </ul>
            
            <div className="mt-8 text-center">
              <Link href="/contact" className="inline-block bg-indigo-deep hover:bg-blue-800 text-white font-medium py-2 px-6 rounded-md transition-colors">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 